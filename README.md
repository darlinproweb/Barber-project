# ✂️ Barbershop Queue

Sistema de cola virtual inteligente para barberías con actualizaciones en tiempo real.

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

# 3. Ejecutar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para la vista del cliente y [http://localhost:3000/admin](http://localhost:3000/admin) para el panel de administración.

---

## 📁 Estructura del Proyecto

```
app/
├── page.tsx                    # Página principal (cliente)
├── error.tsx                   # Error boundary (cliente)
├── layout.tsx                  # Layout raíz
├── globals.css                 # Estilos globales
├── admin/
│   ├── page.tsx                # Página admin (login + dashboard)
│   ├── error.tsx               # Error boundary (admin)
│   ├── AdminDashboard.tsx      # Dashboard principal
│   ├── AdminStatsPanel.tsx     # Estadísticas en vivo
│   ├── QueueControlPanel.tsx   # Controles de la cola
│   └── BarberLogin.tsx         # Login de barberos
├── components/
│   ├── QueueEntryForm.tsx      # Formulario para entrar a la cola
│   ├── QueueStatus.tsx         # Estado del cliente en la cola
│   └── ErrorBoundary.tsx       # Error boundary reutilizable
├── lib/
│   ├── authActions.ts          # 🔐 Auth server-side (Server Actions)
│   ├── adminActions.ts         # Admin CRUD (Server Actions protegidas)
│   ├── serverActions.ts        # Acciones del cliente (Server Actions)
│   ├── admin.ts                # Suscripciones realtime del admin
│   ├── supabase.ts             # Cliente Supabase + helpers
│   └── validation.ts           # Validación y sanitización
└── types/
    └── index.ts                # Tipos centralizados
```

---

## 🔐 Seguridad

### Autenticación
- Las credenciales de barberos **nunca** se envían al navegador
- Login se ejecuta como Server Action (`authActions.ts`)
- Sesión almacenada en cookie **httpOnly** (no accesible por JavaScript)
- Cada Server Action de admin verifica la sesión antes de ejecutar

### Validación
- Inputs sanitizados contra XSS e inyección SQL
- Rate limiting en memoria para prevenir abuso
- Tipos estrictos en todo el codebase (cero `any`)

---

## 🗃️ Base de Datos (Supabase)

### Tabla: `queue_positions`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | ID primario |
| `customer_id` | TEXT | ID único del cliente |
| `customer_name` | TEXT | Nombre del cliente |
| `customer_phone` | TEXT | Teléfono del cliente |
| `position` | INTEGER | Posición en la cola |
| `status` | TEXT | `waiting`, `in_service`, `completed`, `cancelled` |
| `estimated_service_time` | INTEGER | Tiempo estimado (minutos) |
| `service_duration` | INTEGER | Duración real del servicio |
| `entry_time` | TIMESTAMPTZ | Hora de entrada |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

### Funciones SQL

Ejecutar `supabase_queue_functions.sql` en el SQL Editor de Supabase:

- **`join_queue_atomic()`** — Asigna posiciones atómicamente (evita race conditions)
- **`recalculate_positions()`** — Recalcula todas las posiciones en una sola query

### Seguridad RLS

Ejecutar `SECURITY_RLS.sql` para habilitar Row Level Security:
- Clientes solo ven su propia posición
- Barberos ven toda la cola
- Índices para rendimiento

---

## ⚡ Stack Tecnológico

| Tecnología | Uso |
|---|---|
| **Next.js 16** | Framework React + Server Actions |
| **React 19** | UI reactiva |
| **Supabase** | Base de datos + Realtime |
| **Tailwind CSS v4** | Estilos |
| **TypeScript** | Tipado estricto |
| **react-hot-toast** | Notificaciones |

---

## 🧑‍💻 Cuentas Demo

> ⚠️ Solo para desarrollo. En producción, migrar a variables de entorno o tabla de Supabase.

| Nombre | Email | Contraseña |
|---|---|---|
| Carlos | carlos@barbershop.com | demo123 |
| Miguel | miguel@barbershop.com | demo123 |
| Juan | juan@barbershop.com | demo123 |

---

## 📌 Próximos Pasos

- [ ] Mover credenciales demo a variables de entorno
- [ ] Notificaciones push/SMS cuando faltan 2 turnos
- [ ] Soporte multi-barbería
- [ ] Historial de visitas del cliente
- [ ] Reservas previas por hora
