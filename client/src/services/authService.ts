import { User } from '../types';
import { apiService } from './api';

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

interface RefreshResponse {
  token: string;
  expiresIn: number;
}

class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly TOKEN_KEY = 'kiro_token';
  private readonly REFRESH_TOKEN_KEY = 'kiro_refresh_token';
  private readonly USER_KEY = 'kiro_user';

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      // In production, this would call the real backend
      const response = await apiService.post('/auth/login', {
        username,
        password
      });
      
      const loginData: LoginResponse = response.data;
      
      // Store tokens and user data
      this.storeAuthData(loginData);
      
      // Set up automatic token refresh
      this.scheduleTokenRefresh(loginData.expiresIn);
      
      return loginData;
    } catch (error: any) {
      // Fallback to demo login for development
      if (username === 'demo' && password === 'demo') {
        const demoResponse: LoginResponse = {
          user: {
            id: '1',
            username: 'demo',
            email: 'demo@kiromini.com',
            role: 'radiologist',
            full_name: 'Dr. Demo Radiologist',
            npi: '1234567890',
            specialty: 'Diagnostic Radiology',
          },
          token: 'demo-jwt-token-' + Date.now(),
          refreshToken: 'demo-refresh-token-' + Date.now(),
          expiresIn: 3600 // 1 hour
        };
        
        this.storeAuthData(demoResponse);
        this.scheduleTokenRefresh(demoResponse.expiresIn);
        
        return demoResponse;
      }
      
      throw new Error(error.response?.data?.message || 'Invalid credentials');
    }
  }

  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await apiService.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async validateToken(token: string): Promise<User> {
    try {
      const response = await apiService.get('/auth/validate', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data.user;
    } catch (error) {
      // Fallback for demo token
      if (token.startsWith('demo-jwt-token-')) {
        return {
          id: '1',
          username: 'demo',
          email: 'demo@kiromini.com',
          role: 'radiologist',
          full_name: 'Dr. Demo Radiologist',
          npi: '1234567890',
          specialty: 'Diagnostic Radiology',
        };
      }
      
      throw new Error('Invalid token');
    }
  }

  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiService.post('/auth/refresh', {
        refreshToken
      });
      
      const refreshData: RefreshResponse = response.data;
      const user = this.getCurrentUser();
      
      if (!user) {
        throw new Error('No user data available');
      }
      
      const loginData: LoginResponse = {
        user,
        token: refreshData.token,
        refreshToken,
        expiresIn: refreshData.expiresIn
      };
      
      this.storeAuthData(loginData);
      this.scheduleTokenRefresh(refreshData.expiresIn);
      
      return loginData;
    } catch (error: any) {
      // If refresh fails, clear auth data and redirect to login
      this.clearAuthData();
      throw new Error(error.response?.data?.message || 'Token refresh failed');
    }
  }

  getCurrentUser(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  private storeAuthData(data: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, data.token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleTokenRefresh(expiresIn: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Refresh token 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshToken();
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
          // Optionally redirect to login or show notification
        }
      }, refreshTime);
    }
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await apiService.put('/auth/profile', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedUser = response.data.user;
      localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Profile update failed');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      await apiService.post('/auth/change-password', {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password change failed');
    }
  }
}

export const authService = new AuthService();