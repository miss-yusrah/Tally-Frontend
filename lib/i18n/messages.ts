import type { LocaleCode, MessageTree } from "./types";

/** English catalog — eager (see asyncCatalogs.ts for the other locales). */
export const en: MessageTree = {
  nav: {
    home: "Home",
    groups: "Groups",
    explore: "Explore",
    wallet: "Wallet",
    profile: "Profile",
  },
  common: {
    done: "Done",
    cancel: "Cancel",
    back: "Back",
    save: "Save",
    optional: "Optional",
  },
  profile: {
    title: "Profile",
    editProfile: "Edit profile",
    paymentMethod: "Payment method",
    passwordSecurity: "Password and Security",
    kycStatus: "KYC Status",
    language: "Language",
    notifications: "Notifications",
    currency: "Currency",
    tripHistory: "Trip History",
    settlementReminder: "Settlement reminder",
    transactionHistory: "Transaction History",
    helpCenter: "Help center",
    rateApp: "Rate the app",
    shareFriends: "Share with friends",
    about: "About",
    signOut: "Sign out",
  },
  language: {
    title: "Language",
    subtitle: "Choose the language you want to use in Tabr",
    updated: "Language updated",
    failed: "Couldn't update language. Please try again.",
  },
  currency: {
    title: "Home currency",
    search: "Search currency",
    common: "Common",
    all: "All currencies",
    updated: "Home currency updated",
    failed: "Couldn't update home currency. Please try again.",
    empty: "No currencies match your search",
  },
  notifications: {
    title: "Notifications",
    settlements: "Settlements",
    settlementsDesc: "Receive updates on settlements",
    groupsTrips: "Groups and trips",
    groupsTripsDesc: "Updates on group and trip activities",
    explore: "Explore",
    exploreDesc: "Place suggestions",
  },
  help: {
    title: "Help centre",
    heading: "How can we help?",
    contactPrefix: "Contact us at",
  },
  kyc: {
    title: "KYC status",
    pendingHeading: "Complete your KYC",
    pendingBody: "Finish KYC to enjoy all app features",
    failedHeading: "Verification failed",
    failedBody:
      "Something went wrong with your KYC. Try again to unlock all app features.",
    verifiedHeading: "You're verified",
    verifiedBody: "Your KYC is complete. You have full access to app features.",
    pending: "Pending",
    failed: "Failed",
    verified: "Verified",
  },
  changePassword: {
    title: "Change password",
    current: "Current password",
    newPassword: "New password",
    repeat: "Repeat password",
    submit: "Change password",
    updating: "Updating…",
    updated: "Password updated",
    ruleHint: "Use at least 8 characters and one number",
    mismatch: "Passwords don't match",
    sameAsCurrent: "New password must be different from your current password",
  },
  editProfile: {
    title: "Edit profile",
    editPhoto: "Edit photo",
    name: "Name",
    username: "Username",
    updated: "Profile updated",
    failed: "Couldn't update your profile. Please try again.",
  },
  photo: {
    title: "Profile photo",
    take: "Take photo",
    choose: "Choose photo",
    delete: "Delete photo",
  },
};

/** Deep-merge locale over English so missing keys stay readable. */
export function merge(base: MessageTree, patch: DeepPartial<MessageTree>): MessageTree {
  return {
    nav: { ...base.nav, ...patch.nav },
    common: { ...base.common, ...patch.common },
    profile: { ...base.profile, ...patch.profile },
    language: { ...base.language, ...patch.language },
    currency: { ...base.currency, ...patch.currency },
    notifications: { ...base.notifications, ...patch.notifications },
    help: { ...base.help, ...patch.help },
    kyc: { ...base.kyc, ...patch.kyc },
    changePassword: { ...base.changePassword, ...patch.changePassword },
    editProfile: { ...base.editProfile, ...patch.editProfile },
    photo: { ...base.photo, ...patch.photo },
  };
}

type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> };


/**
 * Eager catalog: English only, so every page ships just one locale.
 * Other languages live in ./asyncCatalogs and load on demand (see localeStore).
 */
export function getMessages(locale: LocaleCode): MessageTree {
  return en;
}
