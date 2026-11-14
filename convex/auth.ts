import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";
import {
  ACTIVITY_TYPES,
  GOVERNORATES,
  normalizeTnPhone,
} from "./rules";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Validates the reseller sign-up fields. Runs on the server for every
 * sign-up, whatever the browser sent.
 */
function signUpProfile(params: Record<string, unknown>) {
  const email = str(params.email).toLowerCase();
  const fields = {
    shopName: str(params.shopName),
    activityType: str(params.activityType),
    taxId: str(params.taxId) || undefined,
    rne: str(params.rne) || undefined,
    fullName: str(params.fullName),
    phone: normalizeTnPhone(str(params.phone)),
    whatsapp: str(params.whatsapp)
      ? normalizeTnPhone(str(params.whatsapp))
      : undefined,
    governorate: str(params.governorate),
    city: str(params.city),
    address: str(params.address),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ConvexError("Adresse email invalide.");
  if (fields.shopName.length < 2 || fields.shopName.length > 120)
    throw new ConvexError("Nom commercial invalide.");
  if (!(ACTIVITY_TYPES as readonly string[]).includes(fields.activityType))
    throw new ConvexError("Type d'activité invalide.");
  if (fields.fullName.length < 2 || fields.fullName.length > 120)
    throw new ConvexError("Nom et prénom invalides.");
  if (!fields.phone)
    throw new ConvexError("Téléphone invalide (format +216 suivi de 8 chiffres).");
  if (fields.whatsapp === null)
    throw new ConvexError("Numéro WhatsApp invalide.");
  if (!(GOVERNORATES as readonly string[]).includes(fields.governorate))
    throw new ConvexError("Gouvernorat invalide.");
  if (!fields.city || fields.city.length > 80)
    throw new ConvexError("Ville invalide.");
  if (fields.address.length < 4 || fields.address.length > 200)
    throw new ConvexError("Adresse invalide.");
  return { email, ...fields, phone: fields.phone, whatsapp: fields.whatsapp ?? undefined };
}

/**
 * Admin access request: only name, email and phone. The account starts as a
 * pending admin with no access until the super admin approves it.
 */
function adminSignUpProfile(params: Record<string, unknown>) {
  const email = str(params.email).toLowerCase();
  const fullName = str(params.fullName);
  const phone = normalizeTnPhone(str(params.phone));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ConvexError("Adresse email invalide.");
  if (fullName.length < 2 || fullName.length > 120)
    throw new ConvexError("Nom et prénom invalides.");
  if (!phone)
    throw new ConvexError("Téléphone invalide (format +216 suivi de 8 chiffres).");
  return { kind: "admin" as const, email, fullName, phone };
}

type SignUp =
  | ReturnType<typeof adminSignUpProfile>
  | (ReturnType<typeof signUpProfile> & { kind?: undefined });

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        if (params.flow === "signUp") {
          const p: SignUp =
            params.kind === "admin" ? adminSignUpProfile(params) : signUpProfile(params);
          // Extra keys travel to createOrUpdateUser below.
          return { ...p, name: p.fullName } as never;
        }
        return { email: str(params.email).toLowerCase() };
      },
      validatePasswordRequirements(password: string) {
        if (password.length < 8)
          throw new ConvexError(
            "Le mot de passe doit contenir au moins 8 caractères.",
          );
      },
    }),
  ],
  callbacks: {
    // Creates the user and its profile in one transaction. A new account is
    // always pending (reseller, or admin when requested from
    // /admin/inscription); only an admin can approve a reseller and only the
    // super admin can approve an admin.
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) return args.existingUserId;
      const p = args.profile as unknown as SignUp;
      const userId = await ctx.db.insert("users", {
        email: p.email,
        name: p.fullName,
        phone: p.phone,
      });
      if (p.kind === "admin") {
        await ctx.db.insert("profiles", {
          userId,
          role: "admin",
          status: "pending",
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
          shopName: "",
          activityType: "",
          governorate: "",
          city: "",
          address: "",
        });
        return userId;
      }
      await ctx.db.insert("profiles", {
        userId,
        role: "reseller",
        status: "pending",
        shopName: p.shopName,
        activityType: p.activityType,
        taxId: p.taxId,
        rne: p.rne,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        whatsapp: p.whatsapp,
        governorate: p.governorate,
        city: p.city,
        address: p.address,
      });
      return userId;
    },
  },
});
