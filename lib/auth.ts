import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtDecode } from "jwt-decode";
import { loginApi, refreshTokenApi } from "./api";

type DecodedAccessToken = {
  _id: string;
  email: string;
  role: string;
  exp?: number;
};

const getTokenExpiry = (accessToken: string) => {
  try {
    const decoded = jwtDecode<DecodedAccessToken>(accessToken);
    return (decoded.exp || 0) * 1000;
  } catch {
    return Date.now() + 30 * 60 * 1000;
  }
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const loginResponse = await loginApi({
          email: credentials.email,
          password: credentials.password,
        });

        if (!loginResponse?.success || !loginResponse.data?.accessToken) return null;

        return {
          id: loginResponse.data._id,
          _id: loginResponse.data._id,
          name: loginResponse.data.name,
          email: loginResponse.data.email,
          role: loginResponse.data.role,
          accessToken: loginResponse.data.accessToken,
          refreshToken: loginResponse.data.refreshToken,
          expiresAt: getTokenExpiry(loginResponse.data.accessToken),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token._id = user._id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.expiresAt = user.expiresAt;
      }

      if (token?.expiresAt && Date.now() < token.expiresAt - 30_000) {
        return token;
      }

      if (!token.refreshToken) return token;

      try {
        const refreshed = await refreshTokenApi(token.refreshToken);
        token.accessToken = refreshed.data.accessToken;
        token.refreshToken = refreshed.data.refreshToken;
        token.expiresAt = getTokenExpiry(refreshed.data.accessToken);
        delete token.error;
      } catch {
        token.accessToken = undefined;
        token.refreshToken = undefined;
        token.expiresAt = 0;
        token.error = "RefreshAccessTokenError";
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.role = token.role;
      session._id = token._id;
      session.error = token.error;

      if (session.user) {
        session.user.name = token.name;
        session.user.email = token.email;
        session.user._id = token._id;
        session.user.role = token.role;
      }

      return session;
    },
  },
};
