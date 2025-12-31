# 🚀 Quick Start Guide

Get the clinic scheduling system running in 5 minutes!

## Option 1: Docker (Recommended)

### Prerequisites
- Docker Desktop installed
- 8GB RAM available

### Steps

```bash
# 1. Navigate to project
cd clinic-scheduling

# 2. Start everything
docker-compose up -d

# 3. Wait for services to start (30-60 seconds)
docker-compose logs -f

# 4. Open your browser
# Frontend: http://localhost:5173
# API Docs: http://localhost:3000/api-docs
```

That's it! The database will be automatically created and seeded with test data.

### Test the System

1. **Open Frontend**: http://localhost:5173
2. **Select a Doctor**: Click on "Dr. Sarah Johnson"
3. **Pick a Date**: Choose tomorrow's date
4. **See Available Slots**: Green slots are available
5. **Book an Appointment**:
   - Fill in patient name
   - Select a time
   - Click "Book Appointment"

### Test Tenants

Switch between clinics in the dropdown:
- **Downtown Clinic** (`downtown-clinic`)
- **Westside Medical** (`westside-medical`)

## Option 2: Manual Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16+

### Steps

```bash
# 1. Setup Database
createdb clinic_scheduling
psql -d clinic_scheduling -f database/migrations/001_initial_schema.sql

# 2. Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run dev

# 3. Setup Frontend (in new terminal)
cd frontend
npm install
npm run dev
```

## 🧪 Test the API

### Using curl

```bash
# Get all doctors
curl -H "X-Tenant-Id: downtown-clinic" \
     http://localhost:3000/api/doctors

# Check availability
curl -H "X-Tenant-Id: downtown-clinic" \
     "http://localhost:3000/api/availability?doctor_id=aaaa1111-1111-1111-1111-111111111111&date=2025-01-15"

# Create appointment
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: downtown-clinic" \
  -d '{
    "doctor_id": "aaaa1111-1111-1111-1111-111111111111",
    "patient_name": "John Doe",
    "patient_email": "john@example.com",
    "starts_at": "2025-01-15T14:00:00Z",
    "ends_at": "2025-01-15T14:30:00Z"
  }'
```

### Using Swagger UI

1. Open http://localhost:3000/api-docs
2. Click "Try it out" on any endpoint
3. Add `X-Tenant-Id: downtown-clinic` header
4. Execute the request

## 📊 View the Database

```bash
# Connect to database
docker exec -it clinic-db psql -U clinic_user -d clinic_scheduling

# Run queries
SELECT * FROM tenants;
SELECT * FROM doctors;
SELECT * FROM appointments;
```

## 🛑 Stop Everything

```bash
# Stop services (data persists)
docker-compose down

# Stop and remove data
docker-compose down -v
```

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Database won't start
```bash
# View logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### Frontend can't connect to backend
```bash
# Check backend is running
curl http://localhost:3000/health

# Should return: {"status":"healthy",...}
```

## 📚 Next Steps

- Read the full [README.md](./README.md)
- Explore [API Documentation](http://localhost:3000/api-docs)
- Check [Backend README](./backend/README.md)
- Review [Database Schema](./database/README.md)

## 🎯 Key Features to Test

1. **Multi-tenancy**: Switch clinics and see different doctors
2. **Conflict Prevention**: Try booking the same slot twice
3. **Real-time Availability**: See slots update after booking
4. **Validation**: Try invalid data (past dates, wrong format)
5. **Calendar View**: Book multiple appointments

## 💡 Tips

- Use Chrome DevTools Network tab to see API calls
- Check backend logs: `docker-compose logs backend`
- Database has 4 test doctors with different schedules
- Sample appointments are pre-loaded for testing

---

**Need help?** Check the main [README.md](./README.md) or API docs!

