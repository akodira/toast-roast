-- Toast & Roast — PostgreSQL schema (works on Supabase as-is)
-- Run in the Supabase SQL Editor, or via `psql`. This mirrors what
-- lib/db.js auto-creates on first run — running it by hand is optional.

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

-- Seed data (roles, admin user, settings, menu) is inserted automatically
-- by the app on first run (lib/db.js). To seed by hand instead, see
-- lib/db.js's `seed()` function for the full statement list.
