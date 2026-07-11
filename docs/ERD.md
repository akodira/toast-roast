# Entity Relationship Diagram

```mermaid
erDiagram
  Roles ||--o{ Users : "has"
  Categories ||--o{ MenuItems : "contains"
  Customers ||--o{ Orders : "places"
  Orders ||--o{ OrderDetails : "includes"
  MenuItems ||--o{ OrderDetails : "referenced by"
  Users ||--o{ ActivityLog : "performs"

  Roles { int RoleId PK  string Name }
  Users { int UserId PK  string Username  string PasswordHash  string FullName  int RoleId FK  bool IsActive }
  Categories { int CategoryId PK  string Name  int DisplayOrder  bool IsActive }
  MenuItems { int MenuItemId PK  int CategoryId FK  string Name  string Description  decimal Price  string ImageUrl  bool IsAvailable  bool IsActive  int DisplayOrder }
  Customers { int CustomerId PK  string Name  string Email  string Telephone }
  Orders { int OrderId PK  string OrderNumber  int CustomerId FK  string TableNumber  decimal Subtotal  decimal TaxPercent  decimal TaxAmount  decimal ServicePercent  decimal ServiceAmount  decimal GrandTotal  string Status  datetime CreatedAt }
  OrderDetails { int OrderDetailId PK  int OrderId FK  int MenuItemId FK  string ItemName  decimal UnitPrice  int Quantity  decimal LineTotal }
  Settings { string SettingKey PK  string SettingValue }
  WebsiteContent { string ContentKey PK  string ContentValue  datetime UpdatedAt }
  ActivityLog { int LogId PK  int UserId FK  string Action  string Details  datetime CreatedAt }
```

Notes: Tax and service percentages are stored in `Settings` (keys `tax_percent`, `service_percent`) and are also snapshotted on every order, so historical invoices never change when the rates change. `OrderDetails.ItemName` and `UnitPrice` are snapshots for the same reason.
