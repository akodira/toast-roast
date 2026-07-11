// Database layer — PostgreSQL (Supabase) via the `pg` driver.
// Schema mirrors database/postgres_schema.sql (see docs/ERD.md).
// Async-only, same shape as the MSSQL variant: getDb().prepare(sql).get/all/run(...)
const { Pool, types } = require("pg");
const bcrypt = require("bcryptjs");

// pg returns NUMERIC/DECIMAL (OID 1700) and BIGINT/COUNT (OID 20) as strings
// by default, to avoid silent precision loss on huge numbers. This app's
// values (prices, counts) are always safely within JS number range, and the
// UI code (e.g. `.toFixed(2)` on Price) expects real numbers — so convert.
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));
// pg also parses TIMESTAMPTZ/TIMESTAMP (OIDs 1184, 1114) into native JS Date
// objects by default. React can't render a Date directly as JSX ("Objects
// are not valid as a React child") — every CreatedAt/UpdatedAt column would
// crash the page it's shown on. Keep them as the raw ISO-ish text Postgres
// sends instead; format with `new Date(x).toLocaleString()` at display time.
types.setTypeParser(1184, (val) => val);
types.setTypeParser(1114, (val) => val);
types.setTypeParser(1082, (val) => val); // DATE (e.g. the `::date` cast in stats queries)

// Postgres folds unquoted identifiers to lowercase on both storage and
// result columns, so `SELECT Price FROM MenuItems` comes back as `price`,
// not `Price`. Every query/JS call site in this app was written expecting
// the PascalCase names as declared in the schema — so we translate row
// keys back on the way out, once, centrally, instead of quoting every
// identifier in every query across the codebase.
const COLUMN_MAP = {
  roleid: "RoleId", name: "Name", userid: "UserId", username: "Username",
  passwordhash: "PasswordHash", fullname: "FullName", isactive: "IsActive",
  createdat: "CreatedAt", categoryid: "CategoryId", namear: "NameAr",
  displayorder: "DisplayOrder", menuitemid: "MenuItemId", description: "Description",
  price: "Price", imageurl: "ImageUrl", isavailable: "IsAvailable",
  customerid: "CustomerId", email: "Email", telephone: "Telephone",
  orderid: "OrderId", ordernumber: "OrderNumber", tablenumber: "TableNumber",
  subtotal: "Subtotal", taxpercent: "TaxPercent", taxamount: "TaxAmount",
  servicepercent: "ServicePercent", serviceamount: "ServiceAmount",
  grandtotal: "GrandTotal", status: "Status", orderdetailid: "OrderDetailId",
  itemname: "ItemName", unitprice: "UnitPrice", quantity: "Quantity",
  linetotal: "LineTotal", settingkey: "SettingKey", settingvalue: "SettingValue",
  contentkey: "ContentKey", contentvalue: "ContentValue", updatedat: "UpdatedAt",
  logid: "LogId", action: "Action", details: "Details",
  customername: "CustomerName", catname: "CatName", tableid: "TableId",
};

function remapRow(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[COLUMN_MAP[k] || k] = v;
  return out;
}

let pool = null;
let readyPromise = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Supabase's pooler requires SSL; disable only for local Postgres without SSL.
      ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

// Returns a ready-to-use { prepare(sql) => { get, all, run } } wrapper.
// Schema is created/seeded on first call (and cached after).
async function getDb() {
  const p = getPool();
  if (!readyPromise) {
    readyPromise = (async () => {
      await migrate(p);
      await seed(p);
    })().catch((err) => {
      readyPromise = null; // allow retry on next call
      throw err;
    });
  }
  await readyPromise;
  return makeDb(p);
}

// ---- query helpers --------------------------------------------------------

// `client` is either the pool (auto-connects per query) or a checked-out
// client bound to a transaction (see withTransaction).
function makeDb(client) {
  return {
    prepare(text) {
      // Postgres uses positional $1,$2,... — callers already write SQL this way.
      return {
        async get(...params) {
          const result = await client.query(text, params);
          return remapRow(result.rows[0]);
        },
        async all(...params) {
          const result = await client.query(text, params);
          return result.rows.map(remapRow);
        },
        async run(...params) {
          const result = await client.query(text, params);
          const row = result.rows && result.rows[0];
          return {
            changes: result.rowCount || 0,
            // Works when the INSERT includes `RETURNING <pk> AS id` (see seed()/routes).
            lastInsertRowid: row && row.id != null ? Number(row.id) : undefined,
          };
        },
      };
    },
  };
}

// Runs `fn(tdb)` inside a Postgres transaction on a single checked-out
// client. Commits on success, rolls back on throw.
async function withTransaction(fn) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const tdb = makeDb(client);
    const result = await fn(tdb);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---- schema -----------------------------------------------------------

async function migrate(p) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS Roles (
      RoleId SERIAL PRIMARY KEY,
      Name VARCHAR(50) NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS Users (
      UserId SERIAL PRIMARY KEY,
      Username VARCHAR(100) NOT NULL UNIQUE,
      PasswordHash VARCHAR(255) NOT NULL,
      FullName VARCHAR(200) NULL,
      RoleId INT NOT NULL DEFAULT 1 REFERENCES Roles(RoleId),
      IsActive BOOLEAN NOT NULL DEFAULT TRUE,
      CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS Categories (
      CategoryId SERIAL PRIMARY KEY,
      Name VARCHAR(200) NOT NULL,
      NameAr VARCHAR(200) NULL,
      DisplayOrder INT NOT NULL DEFAULT 0,
      IsActive BOOLEAN NOT NULL DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS MenuItems (
      MenuItemId SERIAL PRIMARY KEY,
      CategoryId INT NOT NULL REFERENCES Categories(CategoryId) ON DELETE CASCADE,
      Name VARCHAR(200) NOT NULL,
      Description TEXT NULL,
      Price DECIMAL(10,2) NOT NULL,
      ImageUrl VARCHAR(400) NULL,
      IsAvailable BOOLEAN NOT NULL DEFAULT TRUE,
      IsActive BOOLEAN NOT NULL DEFAULT TRUE,
      DisplayOrder INT NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS Customers (
      CustomerId SERIAL PRIMARY KEY,
      Name VARCHAR(200) NOT NULL,
      Email VARCHAR(200) NOT NULL,
      Telephone VARCHAR(50) NOT NULL,
      CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS Orders (
      OrderId SERIAL PRIMARY KEY,
      OrderNumber VARCHAR(50) NOT NULL UNIQUE,
      CustomerId INT NOT NULL REFERENCES Customers(CustomerId),
      TableNumber VARCHAR(20) NOT NULL,
      Subtotal DECIMAL(10,2) NOT NULL,
      TaxPercent DECIMAL(5,2) NOT NULL,
      TaxAmount DECIMAL(10,2) NOT NULL,
      ServicePercent DECIMAL(5,2) NOT NULL,
      ServiceAmount DECIMAL(10,2) NOT NULL,
      GrandTotal DECIMAL(10,2) NOT NULL,
      Status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS OrderDetails (
      OrderDetailId SERIAL PRIMARY KEY,
      OrderId INT NOT NULL REFERENCES Orders(OrderId) ON DELETE CASCADE,
      MenuItemId INT NULL REFERENCES MenuItems(MenuItemId),
      ItemName VARCHAR(200) NOT NULL,
      UnitPrice DECIMAL(10,2) NOT NULL,
      Quantity INT NOT NULL,
      LineTotal DECIMAL(10,2) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Settings (
      SettingKey VARCHAR(100) PRIMARY KEY,
      SettingValue TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS WebsiteContent (
      ContentKey VARCHAR(100) PRIMARY KEY,
      ContentValue TEXT NOT NULL,
      UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ActivityLog (
      LogId SERIAL PRIMARY KEY,
      UserId INT NULL,
      Action VARCHAR(100) NOT NULL,
      Details TEXT NULL,
      CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS Tables (
      TableId SERIAL PRIMARY KEY,
      Name VARCHAR(50) NOT NULL UNIQUE,
      DisplayOrder INT NOT NULL DEFAULT 0,
      IsActive BOOLEAN NOT NULL DEFAULT TRUE
    );
    CREATE INDEX IF NOT EXISTS idx_items_cat ON MenuItems(CategoryId);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(Status);
  `);
}

// ---- seed data ----------------------------------------------------------

async function seed(p) {
  const db = makeDb(p);

  const rolesCount = await db.prepare("SELECT COUNT(*) c FROM Roles").get();
  if (Number(rolesCount.c) === 0) {
    await db.prepare("INSERT INTO Roles (Name) VALUES ('Admin')").run();
    await db.prepare("INSERT INTO Roles (Name) VALUES ('Staff')").run();
  }

  const usersCount = await db.prepare("SELECT COUNT(*) c FROM Users").get();
  if (Number(usersCount.c) === 0) {
    const hash = bcrypt.hashSync("Admin@123", 10);
    await db
      .prepare("INSERT INTO Users (Username,PasswordHash,FullName,RoleId) VALUES ($1,$2,'Administrator',1)")
      .run("admin", hash);
  }

  const defaults = { tax_percent: "14", service_percent: "12", currency: "EGP" };
  for (const [k, v] of Object.entries(defaults)) {
    await db
      .prepare("INSERT INTO Settings (SettingKey,SettingValue) VALUES ($1,$2) ON CONFLICT (SettingKey) DO NOTHING")
      .run(k, v);
  }

  const content = {
    site_name: "Toast & Roast",
    tagline: "Cafe and Restaurant",
    hero_title: "Toast & Roast",
    hero_subtitle: "From slow-roasted fillets to speciality V60 pours — Cairo's cosiest table is set for you.",
    about_html: "<p>Toast & Roast is a Cairo cafe and restaurant built around two crafts: the grill and the roastery. Our kitchen serves everything from creamy chicken casseroles and 250g grilled fillets to savory feteer baked to order, while our coffee corner pours everything from single espresso to Chemex.</p><p>Every plate comes with your choice of two sides, and every visit ends better with a sweet feteer.</p>",
    contact_address: "Cairo, Egypt",
    contact_phone: "+20 100 000 0000",
    contact_email: "hello@toastandroast.com",
    opening_hours: "Daily 9:00 AM – 2:00 AM",
    facebook_url: "https://facebook.com/",
    instagram_url: "https://instagram.com/",
    footer_note: "All prices are subject to a 12% service charge and 14% VAT.",
  };
  for (const [k, v] of Object.entries(content)) {
    await db
      .prepare("INSERT INTO WebsiteContent (ContentKey,ContentValue) VALUES ($1,$2) ON CONFLICT (ContentKey) DO NOTHING")
      .run(k, v);
  }

  const tablesCount = await db.prepare("SELECT COUNT(*) c FROM Tables").get();
  if (Number(tablesCount.c) === 0) {
    for (let n = 1; n <= 10; n++) {
      await db.prepare("INSERT INTO Tables (Name,DisplayOrder) VALUES ($1,$2)").run(String(n), n);
    }
  }

  const catCount = await db.prepare("SELECT COUNT(*) c FROM Categories").get();
  if (Number(catCount.c) > 0) return;

  const MENU = {
    "Soups": [["Chicken Cream Soup",149.99],["Chicken Mushroom Soup",174.99],["Mushroom Cream Soup",149.99],["Tomato Cream Soup",139.99],["Onion Soup",149.99],["Broccoli Cream Soup",149.99],["Seafood Soup",294.99],["Lentil Soup",149.99]],
    "Salads": [["Greek Salad",194.99],["Chicken Caesar Salad",239.99],["Chef Salad",279.99],["Crispy Chicken Salad",279.99],["Rocca Salad",189.99],["Beet Salad",209.99],["Seafood Salad",389.99],["Shrimps Salad",394.99],["Salmon Salad",394.99],["Tuna Salad",239.99]],
    "Appetizers": [["Fried Combo",499.99],["Loaded Potatoes",104.99],["Bruschetta",104.99],["Chicken Strips",184.99],["Mozzarella Sticks",174.99],["Onion Rings",164.99],["Chicken Spring Rolls",184.99],["Vegetables Spring Rolls",164.99],["Cheese Spring Rolls",164.99],["Fried Seafood Combo",579.99],["Fried Calamari",209.99],["Fried Shrimps",369.99],["Fish Fingers",209.99],["Shrimp Spring Rolls",209.99]],
    "Chicken": [["Chicken Parmesan",339.99,"صدور دجاج بانيه مغطى بصوص المارينارا والجبنة الموزاريلا والبارميزان"],["Italian Chicken",299.99,"صدور دجاج مشوي مغطي بالمشروم والفلفل الألوان والريحان والموزاريلا"],["Grilled Chicken",289.99,"صدور دجاج مشوية علي الجريل"],["Hickory Chicken",379.99],["Chicken Fajita",319.99,"صدور دجاج مشوي مغطي باللحم المدخن وصوص الباربكيو والجبنة الشيدر"],["Grilled Chicken Fresh Mushroom",319.99,"صدور الدجاج المشوي مغطي بالمشروم الفريش"],["Creamy Chicken Casserole",494.99,"قطع الدجاج مع البيف المدخن والمشروم والصوص الكريمي مغطي بالجبنة الموزاريلا"],["Country Fried Chicken",284.99,"صدور دجاج مقلية"],["Chicken Pane",284.99,"صدور دجاج بانية مقلي"],["Cordon Bleu",414.99,"صدور دجاج محشي بالبيف المدخن وميكس الجبنة مقلي"],["Chicken Sweet Chilli",429.99,"دجاج مقلي مغطي بصوص السويت شيلي"],["Chicken Spinach",319.99,"صدور دجاج بصوص السبانخ والكريمة"]],
    "Beef": [["Grilled Fillet 250gm",589.99,"قطعة لحم 250 جرام مشوي بتوابل توست اند روست"],["Grilled Fillet 300gm",604.99,"قطعة لحم فيلتو 300 جرام مشوي بتوابل توست اند روست"],["Fillet Medallion",604.99,"3 قطع لحم فيلتو 300 جرام مشوي بتوابل توست اند روست"],["Beef Piccata",604.99,"4 قطع لحم 200 جرام تقدم مع صوص من اختيارك"],["Beef Fajita",589.99,"شرائح لحم 250 جرام مع ميكس الفلفل الألوان والبصل، تقدم مع أرز مكسيكان وعيش تورتيلا وصوص كريمة وجبنة شيدر وبيكو دي جالو"],["Fillet & Shrimps",679.99,"قطعة لحم فيلتو 250 جرام مشوي تقدم مع جمبري في صوص أعشاب توست اند روست المميز"],["Beef Stroganoff",604.99,"شرائح لحم 250 جرام مع فلفل ألوان وبصل ومشروم في صوص البراون"],["Rosemary Beef Casserole",604.99,"شرائح فيلتو 250 جرام مع قطع مشروم في صوص روزماري بالكريمة مغطي بالجبنة الموزاريلا"]],
    "Seafood": [["Fish Fillet (Grilled or Fried)",309.99,"قطع السمك الفيليه المشوي أو مقلي"],["Grilled Salmon Steak",599.99,"قطعة سمك سالمون 250 جرام مشوي بطريقة توست اند روست الخاصة"],["Seafood Platter",599.99,"جمبري وكاليماري وبلح البحر وسمك فيليه بصوص الكريمة"],["Salmon Platter",599.99,"جمبري وكاليماري وبلح البحر وقطعة سالمون 100 جرام بصوص الكريمة"],["Seafood Fajita",499.99,"جمبري وكاليماري وبلح البحر وكابوريا ستيك بتوابل الفاهيتا الخاصة"]],
    "Pasta": [["Negresco",284.99],["Chicken Mushroom Pasta",269.99],["Crispy Melted Cheese",269.99],["Chicken Pesto Pasta",269.99],["Chicken Spinach Pasta",269.99],["Mix Cheese Pasta",294.99],["Country Chicken Pasta",269.99],["Beef Stroganoff Pasta",369.99],["Bolognese Pasta",219.99],["Arrabbiata Pasta",189.99],["Seafood Pasta",479.99],["Shrimp Pasta",549.99],["Salmon Pasta",499.99]],
    "Pizza": [["Super Supreme Pizza",294.99],["Chicken Ranch Pizza",239.99],["BBQ Chicken Pizza",239.99],["Pepperoni Pizza",259.99],["Hot Dog Pizza",214.99],["Vegetables Pizza",204.99],["Margherita Pizza",184.99],["Quattro Formaggi Pizza",289.99],["Tuna Pizza",289.99],["Shrimp Pizza",398.99],["Seafood Pizza",369.99]],
    "Savory Feteer": [["Hot Dog Feteer",209.99],["Minced Meat Feteer",239.99],["Sausage Feteer",294.99],["Meat Bag Feteer",329.99],["Pastrami Feteer",294.99],["Mixed Cheese Feteer",264.99],["Chicken BBQ Feteer",284.99],["Crispy Chicken Ranch Feteer",284.99],["Roumy Cheese & Vegetable Feteer",179.99],["Mozzarella Vegetables Feteer",179.99],["Pepperoni Feteer",249.99],["Shrimp Feteer",394.99],["Tuna Feteer",249.99],["Extra Kiri Cheese",39.99]],
    "Sweet Feteer": [["Custard Feteer",149.99],["Cream & Dates",199.99],["Basbousa",159.99],["Sugar Feteer",124.99],["Nutella Feteer",249.99],["Nutella Banana",269.99],["Kunafa Pistachio",269.99],["Nutella Lotus",289.99],["Lotus Feteer",249.99],["Cream & Honey",179.99],["Nutella Pistachio",289.99]],
    "Sandwiches & Burgers": [["Crispy Melt Cheese Sandwich",289.99],["Crispy Chicken Sandwich",249.99],["Chicken Pane Sandwich",249.99],["Chicken Fajita Sandwich",289.99],["Caramelized Steak Sandwich",319.99],["Chicken Quesadillas",319.99],["Mexican Hot Dog Sandwich",194.99],["Mushroom Steak Sandwich",349.99],["Beef Fajita Sandwich",349.99],["Fried Shrimp Sandwich",394.99],["Grilled Chicken Sandwich",249.99],["Toast & Roast Burger",394.99],["Hickory Smoked Burger",394.99],["Cheese Burger",349.99],["Mega Mushroom Burger",394.99],["Bacon Smoked Burger",394.99]],
    "Sides": [["Rice",74.99],["Mexican Rice",89.99],["Pasta",79.99],["Sautée",89.99],["Sweet Corn",49.99],["Mashed Potatoes",74.99],["French Fries",89.99],["Spinach Gratin",89.99]],
    "Sauces": [["Creamy Mushroom Sauce",44.99],["Brown Mushroom Sauce",44.99],["Pepper Sauce",44.99],["Green Pepper Sauce",44.99],["Mustard Sauce",44.99],["Mix Cheese Sauce",49.99],["Parmesan Sauce",44.99],["Lemon Sauce",44.99],["Blue Cheese Sauce",44.99],["Curry Sauce",44.99],["Spanish Sauce",44.99],["Herb Sauce",44.99]],
    "Desserts": [["Cheesecake",124.99],["Chocolate Cake",124.99],["Brownies",134.99],["Crème Caramel",89.99],["Fruit Salad",139.99],["Madness",159.99],["Tiramisu",164.99],["Creamy Chocolate",164.99],["Fettuccine Crepe",219.99,"Your choice of: Nutella – Lotus – Pistachio"],["Crepe Roll",199.99,"Your choice of: Nutella – Lotus – Pistachio"],["Om Ali",139.99],["Carrot Cake",139.99],["Honey Cake",124.99],["Molten Cake",134.99],["Nutella Molten Cake",134.99],["Mix Ice Cream",119.99],["Tres Leches",169.99],["San Sebastián",144.99]],
    "Fresh Juice & Smoothies": [["Lemon",64.99],["Lemon Mint",69.99],["Orange",64.99],["Kiwi",109.99],["Mango",109.99],["Strawberry",74.99],["Guava",74.99],["Pineapple",99.99],["Avocado",129.99],["Banana Milk",89.99],["Seasonal Fresh Juice",129.99]],
    "Ice Coffee & Cold Drinks": [["Frappuccino",109.99,"Caramel – Vanilla – Chocolate – Hazelnut"],["Milkshake",119.99,"Vanilla – Chocolate – Caramel – Mango – Strawberry – Oreo"],["Lotus Milkshake",124.99],["Nutella Milkshake",129.99],["Pistachio Milkshake",124.99],["Pistachio Nutella Milkshake",129.99],["Yogurt Shakes",119.99,"Vanilla – Chocolate – Caramel – Mango – Strawberry – Oreo – Matcha – Banana"],["Yogurt Shakes Pistachio",129.99],["Cold Chocolate",94.99],["Ice Coffee",94.99],["Redbull",119.99],["Soft Drink",59.99],["Small Mineral Water",24.99],["Sparkling Water",59.99]],
    "Cocktails": [["Virgin Mojito",89.99],["Cherry Cola",74.99],["Reval Cocktail",119.99],["Sunshine",89.99],["Refresh",119.99],["Redbull Mojito",134.99],["Mango Kiwi",124.99],["Kiwi Pineapple",124.99],["Leo",134.99],["Healthy Beet",74.99],["Healthy Carrot",74.99],["Healthy Cinnamon",84.99],["Temmys Cocktails (Kids)",89.99,"Strawberry – Mango – Passion Fruit – Chocolate"]],
    "Hot Drinks": [["Tea",49.99],["Tea Barad",84.99],["Matcha Tea",84.99],["Green Tea",54.99],["Earl Grey",54.99],["Flavored Tea",59.99],["Herbal Tea",59.99],["Karak Tea",84.99],["Hot Cider",69.99],["Ginger Earl Grey",54.99],["Sahlab",79.99],["Herbs Power",59.99],["Cinnamon Black Honey",59.99],["Boba (Extra)",54.99]],
    "Hot Chocolate": [["Hot Chocolate",79.99],["Mix Chocolate",89.99],["Crème Brulee",84.99],["Cinnamon Chocolate",84.99],["Swiss Chocolate",94.99]],
    "Hot Coffee Corner": [["Single Espresso",64.99],["Double Espresso",74.99],["Ristretto",64.99],["Espresso Con Panna",84.99],["Chocolate Espresso",84.99],["Espresso Macchiato",74.99],["Vienna Coffee",84.99],["Ginger Latte",84.99],["Flat White",84.99],["Cappuccino",84.99],["Latte",84.99],["Spanish Latte",94.99],["Cortado",84.99],["American",74.99],["Mocha",89.99],["Nescafe",84.99],["Single Turkish Coffee",54.99],["Double Turkish Coffee",64.99],["French Coffee",69.99],["Black & White",79.99]],
    "Speciality Coffee": [["V60",129.99],["Chemex",129.99],["French Press",129.99]],
    "Shisha": [["Mixed Shisha",215],["Fruit Shisha",190],["Lai",30],["Mu'assel",60]],
  };

  await withTransaction(async (tdb) => {
    let cOrder = 1;
    for (const [cat, items] of Object.entries(MENU)) {
      const r = await tdb.prepare("INSERT INTO Categories (Name,DisplayOrder) VALUES ($1,$2) RETURNING CategoryId AS id").run(cat, cOrder++);
      const cid = r.lastInsertRowid;
      let i = 1;
      for (const it of items) {
        await tdb
          .prepare("INSERT INTO MenuItems (CategoryId,Name,Description,Price,DisplayOrder) VALUES ($1,$2,$3,$4,$5)")
          .run(cid, it[0], it[2] || null, it[1], i++);
      }
    }
  });
}

// ---- misc -----------------------------------------------------------------

async function logActivity(userId, action, details) {
  const db = await getDb();
  await db
    .prepare("INSERT INTO ActivityLog (UserId,Action,Details) VALUES ($1,$2,$3)")
    .run(userId ?? null, action, details ?? null);
}

module.exports = { getDb, logActivity, withTransaction };
