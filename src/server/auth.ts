import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  type DefaultSession,
  type NextAuthOptions,
  getServerSession,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { db } from "./db";
import { env } from "~/env";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      id: "voter-auth",
      name: "Voter Login",
      credentials: {
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "email" },
        role: { label: "Role", type: "text" }, // "AUDIENCE" or "JUDGE"
        eventId: { label: "Event ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.name || !credentials?.role || !credentials?.eventId) {
          throw new Error("Missing credentials");
        }

        const { email, name, role, eventId } = credentials;

        // Check if attendee exists
        let attendee = await db.attendee.findFirst({
          where: {
            email,
            events: { some: { id: eventId } }
          },
        });

        if (attendee) {
          // If attendee exists, check if role matches
          if (attendee.type && attendee.type !== role) {
            throw new Error(`You are already registered as ${attendee.type}. Cannot switch to ${role}.`);
          }

          // Update name if missing or changed (optional, but good for consistency)
          if (attendee.name !== name || !attendee.type) {
            attendee = await db.attendee.update({
              where: { id: attendee.id },
              data: { name, type: role }
            });
          }
        } else {
          // Create new attendee
          attendee = await db.attendee.create({
            data: {
              email,
              name,
              type: role,
              events: { connect: { id: eventId } }
            }
          });
        }

        // Return a user object that NextAuth can use. 
        // We are hijacking the User model logic a bit here, or we can use a separate session strategy.
        // Since we want to use the same session mechanism, we'll return an object that looks like a user.
        // However, NextAuth with Prisma adapter usually expects a User record in the 'User' table.
        // BUT, for voters, we might not want to clutter the 'User' table which seems to be for Admins?
        // Let's check the schema again. 'User' has 'isJudge'. 
        // Actually, the requirement says "Audience and Judges". 
        // The 'Attendee' model seems to be the right place for these temporary users.
        // If we use 'jwt' strategy, we don't strictly need a 'User' database record if we don't want to link accounts.
        // But the config uses 'adapter: PrismaAdapter(db)', which implies database sessions usually.
        // However, session strategy is set to "jwt".

        return {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
          role: attendee.type,
        };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _) {
        if (!credentials) return null;
        const user = await db.user.findFirst({
          where: { email: credentials.email },
        });
        if (!user) return null;
        if (
          env.NODE_ENV === "development" &&
          user.email === "test@example.com"
        ) {
          return user;
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: (token as any).role as string,
      },
    }),
  },
  theme: { logo: "/images/logo.png", colorScheme: "light" },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
