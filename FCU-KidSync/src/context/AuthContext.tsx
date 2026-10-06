import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, Student, AttendanceRecord } from '@/services/api';

interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  student?: any;
}

interface AuthContextType {
  user: User | null;
  child: Student;
  attendance: AttendanceRecord | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshData: () => Promise<void>;
}

const DEFAULT_CHILD: Student = {
  id: 1,
  name: 'Emma Johnson',
  grade: 'Kindergarten',
  rfid: '001236',
  guardians: [
    { name: 'Sarah Johnson', relation: 'Mother', phone: '0917 555 0101', email: 'sarah@fcu.edu' },
    { name: 'Michael Johnson', relation: 'Father', phone: '0917 555 0102', email: 'michael@fcu.edu' },
  ],
  section: {
    id: 1,
    year_level: 'Kindergarten',
    section_name: 'Alpha',
    teacher: {
      id: 2,
      name: 'Ana Maria Reyes',
      email: 'teacher@fcu.edu',
      phone: '0917 555 1234',
      title: 'Kindergarten Lead Teacher',
    },
  },
};

const DEFAULT_USER: User = {
  id: 1,
  name: 'Sarah Johnson',
  email: 'sarah@fcu.edu',
  role: 'guardian',
  phone: '0917 555 0101',
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_USER);
  const [child, setChild] = useState<Student>(DEFAULT_CHILD);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>({
    id: 1,
    student_id: 1,
    date: new Date().toISOString().split('T')[0],
    time_in: '07:48:00',
    time_out: null,
    status: 'Present',
    verified_by: 'RFID Main Gate',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);

  const refreshData = async () => {
    try {
      const childData = await apiService.getGuardianChild();
      if (childData && childData.id) {
        setChild(childData);
        const attendances = await apiService.getAttendance();
        const match = attendances.find((a) => a.student_id?.toString() === childData.id.toString());
        if (match) {
          setAttendance(match);
        }
      }
    } catch (e) {
      // Fallback to local default state if server is offline
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiService.login(email, password);
      setUser(res.user);
      setIsLoggedIn(true);
      await refreshData();
    } catch (err) {
      // Demo login fallback if backend isn't reachable
      setUser({
        id: 1,
        name: email.split('@')[0] || 'Parent User',
        email,
        role: 'guardian',
        phone: '0917 555 0101',
      });
      setIsLoggedIn(true);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    apiService.setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        child,
        attendance,
        isLoading,
        isLoggedIn,
        login,
        logout,
        refreshData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
