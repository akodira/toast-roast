# API Documentation

Base URL: `http://localhost:3000`
Admin endpoints require the `tr_session` httpOnly cookie set by login. All requests/responses are JSON.

## Auth
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | /api/auth/login | `{username, password}` | Sets session cookie (JWT, 8h) |
| POST | /api/auth/logout | – | Clears cookie |

## Public
| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/public/menu | Active categories, items, settings |
| POST | /api/orders | Place order: `{tableNumber, name, email, telephone, items:[{menuItemId, quantity}]}`. Prices and totals are computed server-side. Returns `{orderNumber}` |
| GET | /api/orders/{orderNumber} | Full invoice for a confirmed order |

## Admin (session required)
| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/orders?status=Pending | List orders with items (status filter optional) |
| PATCH | /api/orders/{orderId} | `{status}` — Pending/Preparing/Ready/Served/Completed/Cancelled |
| GET/POST | /api/admin/categories | List / create `{Name, DisplayOrder, IsActive}` |
| PUT/DELETE | /api/admin/categories/{id} | Update / delete |
| GET/POST | /api/admin/items | List / create `{CategoryId, Name, Description, Price, ImageUrl, IsAvailable, IsActive, DisplayOrder}` |
| PUT/DELETE | /api/admin/items/{id} | Update / delete |
| GET/PUT | /api/admin/settings | `{tax_percent, service_percent, currency}` — validated 0–100 |
| GET/PUT | /api/admin/content | Website content key/value map (home, about, contact, hours, socials, footer) |
| GET/POST | /api/admin/users | List / create `{Username, Password(≥8), FullName, RoleId}` |
| PUT | /api/admin/users/{id} | Update, reset password, enable/disable |
| GET | /api/admin/stats | Dashboard: today's orders, pending, completed, total sales, customers, 7-day revenue |
| POST | /api/admin/upload | multipart `file` (jpg/png/webp ≤3MB) → `{url}` |

Errors return `{error: "message"}` with 400/401/404 status codes.
