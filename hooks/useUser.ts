"use client";

export function useUser() {
  return {
    user: {
      id: "mock-user-id",
      email: "user@example.com",
      user_metadata: {
        credits: 100,
        subscriptionTier: "PRO",
      },
    },
    loading: false,
  };
}
