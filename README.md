# FCU Kindergarten RFID Monitoring & Secure Handover System

A modern, mobile-responsive Web Application designed to manage student registration, class sections, daily RFID attendance tracking, and secure parent/guardian handovers at classroom dismissal gates.

---

## 🛠️ Tech Stack
- **Backend**: Laravel (PHP), Eloquent ORM, MySQL
- **Frontend**: React, Vite, TypeScript, Vanilla CSS/TailwindCSS, Lucide Icons

---

## 📋 Prerequisites
Before setting up the project, make sure you have the following installed on your system:
- **PHP** (>= 8.2) & **Composer**
- **Node.js** (>= 18) & **npm**
- **XAMPP** (or any MySQL database runner)

---

## 🚀 Installation & Local Setup

### 1. Database Setup
1. Start **Apache** and **MySQL** in your XAMPP Control Panel.
2. Open [phpMyAdmin](http://localhost/phpmyadmin) in your browser.
3. Create a new database named `mobile_based_rfid_monitoring_fcu_kindergarten` (or any name you prefer).

---

### 2. Backend Setup (Laravel Server)
1. Open your terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Copy the environment configuration file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and set up your database connection:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=mobile_based_rfid_monitoring_fcu_kindergarten
   DB_USERNAME=root
   DB_PASSWORD=
   ```
4. Install PHP dependencies:
   ```bash
   composer install
   ```
5. Generate the application key:
   ```bash
   php artisan key:generate
   ```
6. Run database migrations and seed the default accounts:
   ```bash
   php artisan migrate --seed
   ```
7. Start the backend local server:
   ```bash
   php artisan serve --host=0.0.0.0 --port=8000
   ```

---

### 3. Frontend Setup (React Client)
1. Open a new terminal window and navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Create/update your `.env` configuration file:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```
3. Install frontend dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev -- --host
   ```
5. Open the link in your browser (usually [http://localhost:5173](http://localhost:5173)).

---

## 🔑 Default Login Accounts
Use these pre-seeded accounts to log in and test different system dashboards:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@fcu.edu` | `password` |
| **Class Teacher** | `teacher@fcu.edu` | `password` |
| **Parent/Guardian** | `guardian@fcu.edu` | `password` |

---

## 🎯 Key Modules & Features

### 👤 Teacher Profile
- **Consolidated Summary**: View full legal name, birth date, location, title, and assigned classroom section metadata.
- **Dynamic Student Tracking**: Automatically calculates and displays the total number of assigned pupils.
- **Inline Editing**: Allows instant profile updates and secure password changes.

### 📊 Reports Page Dashboard
- **Daily Attendance Report**: Real-time stats breakdown (Present, Late, Absent) by classroom section with table grid reports.
- **Weekly Attendance Report**: visualizes section attendance compliance ratings.
- **Monthly Attendance Report**: Computes student-by-student attendance ratios for monthly record compilations.
- **Pickup Handover Logs**: Displays secure dismissal handover timeline logs fetched directly from the server database (Pupil, Guardian, relationship, timestamp, scan method).
- **Late Entry Audit**: Groups and tracks chronic student tardiness frequency.
- **Spreadsheet Exports**: Supports instant CSV file generation and download for daily, monthly, and checkout reports.

### 🔔 Guardian Notifications Bell
- **Notification Dropdown**: Integrated a persistent Bell dropdown menu inside the top Navbar for parent/guardian roles.
- **Real-Time Polling**: Tracks student dismissal handover verification changes in the background.
- **Status Updates**: Alerts the parent on approval, flagged safety audits, or rejection.

---

## 📶 Sharing on Same Wi-Fi (Mobile & Other Laptops)
To access and test the RFID system on mobile phones or other laptops connected to the same Wi-Fi network:

1. **Find your Local IP Address**:
   - Open Command Prompt (cmd) on your host PC and run:
     ```cmd
     ipconfig
     ```
   - Look for the **IPv4 Address** (e.g., `192.168.1.179`).
2. **Update Client Env Configuration**:
   - In your `client/.env` file, change `localhost` to your local IP address:
     ```env
     VITE_API_URL=http://192.168.1.179:8000/api
     ```
3. **Access the App**:
   - On the other device connected to the same Wi-Fi, open the browser and navigate to:
     ```http
     http://[YOUR_IP_ADDRESS]:5173
     ```
     *(Example: `http://192.168.1.179:5173`)*
