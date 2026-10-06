// FCU KidSync API Service
const DEFAULT_API_BASE = 'http://localhost:8000/api';

export interface Guardian {
  id?: string | number;
  name: string;
  relation: string;
  phone: string;
  email: string;
}

export interface Teacher {
  id?: string | number;
  name: string;
  email: string;
  phone?: string;
  title?: string;
}

export interface Section {
  id?: string | number;
  year_level: string;
  section_name: string;
  teacher?: Teacher | null;
}

export interface Student {
  id: string | number;
  name: string;
  grade: string;
  rfid: string;
  guardians: Guardian[];
  section?: Section | null;
  section_id?: string | number | null;
}

export interface AttendanceRecord {
  id: number;
  student_id: number | string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  status: string;
  verified_by?: string;
}

class ApiService {
  private baseUrl = DEFAULT_API_BASE;
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async login(email: string, password: string) {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }
      if (data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error: any) {
      throw error;
    }
  }

  async getGuardianChild(): Promise<Student> {
    const response = await fetch(`${this.baseUrl}/guardian/child`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch child data.');
    }
    return data;
  }

  async getAttendance(date?: string): Promise<AttendanceRecord[]> {
    const url = date ? `${this.baseUrl}/attendance?date=${date}` : `${this.baseUrl}/attendance`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch attendance.');
    }
    return data;
  }
}

export const apiService = new ApiService();
