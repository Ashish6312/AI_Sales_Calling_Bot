# Mierae Solar Sales Assistant - Tech Documentation

## 📊 Dataset & Knowledge Base
The bot is trained on the official **PM Surya Ghar: Muft Bijli Yojana** guidelines.

### Core Data Points:
- **Subsidy Structure**: 
  - Up to 2kW: ₹30,000 per kW.
  - 3kW and above: Total max subsidy of ₹78,000.
- **Financials**:
  - Interest Rate: ~6.75% per annum.
  - EMI Estimates: ₹2,000 - ₹3,500/month.
- **Impact**:
  - Target: 1 Crore (10 Million) households.
  - Benefit: Up to 300 units of free electricity monthly.

## 🚀 Key Features (Assessment Requirements)
1. **Multilingual (100%)**: Full support for Hindi, Telugu, and Odia native scripts.
2. **Sales Qualification**: Automatically detects intent and asks qualifying questions (Roof space, Bill amount).
3. **Objection Handling**: Real-time counter-arguments for cost and installation concerns.
4. **Lead Persistence**: Full-stack integration with **Neon PostgreSQL** to store user details.
5. **Creative Bonus**: Dynamic **Subsidy Estimator Card** that visualizes savings during chat.

## 🛠️ Technical Stack
- **Frontend**: React (Vite) + Vanilla CSS (Glassmorphism).
- **Backend**: FastAPI (Python) + SQLAlchemy.
- **Database**: Neon PostgreSQL.
- **AI Engine**: GPT-4 via Pollinations AI.

## 🔗 Project URLs
- **Live Terminal**: `http://localhost:5173/`
- **Lead API**: `http://localhost:8000/api/leads`
