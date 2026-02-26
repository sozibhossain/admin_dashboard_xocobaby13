import axios, { AxiosError } from "axios";
import { BASE_URL, DASHBOARD_PAGE_SIZE } from "./config";

export type UserRole = "admin" | "fisherman" | "spotOwner" | string;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  results?: number;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  name: string;
  email: string;
  role: UserRole;
  _id: string;
}

export interface DashboardUser {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  avatar?: {
    public_id?: string;
    url?: string;
  };
  service?: string;
  totalBookings?: number;
  totalPaidAmount?: number;
  activeEvents?: number;
}

export interface DashboardMetrics {
  totalFisherman: number;
  totalSpotOwner: number;
  totalRunningEvents: number;
  totalEarnings: number;
  commissionRate: number;
}

export interface SalesPoint {
  month: string;
  total: number;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  salesReport: SalesPoint[];
  recentUsers: Array<{
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    role: UserRole;
    joinDate: string;
    avatar?: string;
  }>;
}

export interface CommissionRow {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerAvatar?: string;
  totalEvents: number;
  totalEarnings: number;
  platformCommission: number;
}

export interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  role: UserRole;
  avatar?: {
    public_id?: string;
    url?: string;
  };
}

const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

type AuthSession = {
  accessToken?: string;
  error?: string;
};

let hasAttachedAuthInterceptor = false;
let sessionRefreshPromise: Promise<AuthSession | null> | null = null;

const getSessionWithRefresh = async () => {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = (async () => {
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      return session as AuthSession | null;
    })().finally(() => {
      sessionRefreshPromise = null;
    });
  }

  return sessionRefreshPromise;
};

const isTokenExpiryError = (error: AxiosError) => {
  if (error.response?.status !== 401) return false;

  const responseData = error.response?.data as { message?: string } | undefined;
  const message = String(responseData?.message || "");

  return /invalid or expired token|token not found|jwt expired/i.test(message);
};

const forceSignOut = async () => {
  try {
    const { signOut } = await import("next-auth/react");
    await signOut({ redirect: false });
  } finally {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
};

const attachInterceptors = () => {
  if (hasAttachedAuthInterceptor || typeof window === "undefined") return;
  hasAttachedAuthInterceptor = true;

  api.interceptors.request.use(async (config) => {
    const session = await getSessionWithRefresh();

    if (session?.error === "RefreshAccessTokenError") {
      await forceSignOut();
      return Promise.reject(new AxiosError("Session expired"));
    }

    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as (typeof error.config & {
        _retry?: boolean;
      }) | undefined;

      if (!originalRequest || originalRequest._retry || !isTokenExpiryError(error)) {
        return Promise.reject(error);
      }

      const requestUrl = String(originalRequest.url || "");
      if (requestUrl.includes("/auth/login") || requestUrl.includes("/auth/refresh-token")) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const session = await getSessionWithRefresh();
        if (!session?.accessToken || session.error === "RefreshAccessTokenError") {
          await forceSignOut();
          return Promise.reject(error);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        await forceSignOut();
        return Promise.reject(refreshError);
      }
    },
  );
};

attachInterceptors();

const toParams = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

export const getApiErrorMessage = (error: unknown) => {
  if (!(error instanceof AxiosError)) return "Something went wrong.";
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Something went wrong."
  );
};

export async function loginApi(payload: { email: string; password: string }) {
  const response = await publicApi.post<ApiResponse<LoginResponseData>>("/auth/login", payload);
  return response.data;
}

export async function forgotPasswordApi(payload: { email: string }) {
  const response = await publicApi.post<ApiResponse<null>>("/auth/forgot-password", payload);
  return response.data;
}

export async function verifyOtpApi(payload: { email: string; otp: string }) {
  const response = await publicApi.post<ApiResponse<{ email: string }>>("/auth/verify", payload);
  return response.data;
}

export async function resetPasswordApi(payload: {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
}) {
  const response = await publicApi.post<ApiResponse<null>>("/auth/reset-password", payload);
  return response.data;
}

export async function refreshTokenApi(refreshToken: string) {
  const response = await publicApi.post<
    ApiResponse<{ accessToken: string; refreshToken: string }>
  >("/auth/refresh-token", {
    refreshToken,
  });
  return response.data;
}

export async function logoutApi() {
  const response = await api.post<ApiResponse<null>>("/auth/logout");
  return response.data;
}

export async function changePasswordApi(payload: { oldPassword: string; newPassword: string }) {
  const response = await api.post<ApiResponse<string>>("/auth/change-password", payload);
  return response.data;
}

export async function getDashboardOverviewApi() {
  const response = await api.get<ApiResponse<DashboardOverview>>("/admin/dashboard-overview");
  return response.data;
}

export async function getUsersApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  includeStats?: boolean;
}) {
  const response = await api.get<ApiResponse<DashboardUser[]>>("/admin/users", {
    params: toParams({
      page: params.page ?? 1,
      limit: params.limit ?? DASHBOARD_PAGE_SIZE,
      search: params.search,
      role: params.role,
      includeStats: params.includeStats ?? true,
    }),
  });
  return response.data;
}

export async function getCommissionReportApi(params: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const response = await api.get<ApiResponse<CommissionRow[]>>("/admin/commission-report", {
    params: toParams({
      page: params.page ?? 1,
      limit: params.limit ?? DASHBOARD_PAGE_SIZE,
      search: params.search,
    }),
  });
  return response.data;
}

export async function getProfileApi() {
  const response = await api.get<ApiResponse<UserProfile>>("/user/profile");
  return response.data;
}

export async function updateProfileApi(payload: {
  fullName: string;
  phone: string;
  bio: string;
  avatar?: File | null;
}) {
  const formData = new FormData();
  formData.append("fullName", payload.fullName);
  formData.append("phone", payload.phone);
  formData.append("bio", payload.bio);
  if (payload.avatar) {
    formData.append("avatar", payload.avatar);
  }

  const response = await api.put<ApiResponse<UserProfile>>("/user/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
