"use client";

import React, { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Camera, User as UserIcon, X, Check, Loader2, UploadCloud, Shield, Building2 } from "lucide-react";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profile: {
    full_name: string | null;
    role: string;
    tenant_id?: string;
  } | null;
  onProfileUpdated: (updated: { full_name: string; avatar_url?: string }) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  profile,
  onProfileUpdated,
}: UserProfileModalProps) {
  const [fullName, setFullName] = useState(
    profile?.full_name || user?.user_metadata?.full_name || ""
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url || null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentDisplayAvatar = previewUrl || avatarUrl;
  const userInitial = (fullName || user?.email || "U").charAt(0).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg("Image size exceeds 10MB limit.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const supabase = createClient();
      let newAvatarUrl = avatarUrl;

      // 1. Upload new avatar to Supabase Storage 'avatars' bucket if selected
      if (selectedFile) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        let uploadedUrl: string | null = null;

        try {
          const formData = new FormData();
          formData.append("photo", selectedFile);

          const { data: { session } } = await supabase.auth.getSession();
          const authHeaders: Record<string, string> = {};
          if (session?.access_token) {
            authHeaders["Authorization"] = `Bearer ${session.access_token}`;
          }

          const uploadResp = await fetch(`${apiBase}/api/v1/user/upload-avatar`, {
            method: "POST",
            headers: authHeaders,
            body: formData,
          });

          if (uploadResp.ok) {
            const data = await uploadResp.json();
            if (data.avatar_url) {
              uploadedUrl = data.avatar_url;
            }
          }
        } catch (apiErr) {
          console.warn("Backend avatar upload fallback:", apiErr);
        }

        // Direct Supabase storage fallback if needed
        if (!uploadedUrl) {
          const ext = selectedFile.name.split(".").pop() || "jpg";
          const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
          const filename = `avatar_${user.id}_${Date.now()}.${cleanExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filename, selectedFile, {
              contentType: selectedFile.type || "image/jpeg",
              upsert: true,
            });

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from("avatars")
              .getPublicUrl(filename);
            uploadedUrl = publicUrl;
          } else if (uploadError) {
            throw new Error(`Avatar upload failed: ${uploadError.message}`);
          }
        }

        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
        }
      }

      // 2. Update Supabase Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          avatar_url: newAvatarUrl,
        },
      });

      if (authError) {
        console.warn("Auth user update notice:", authError);
      }

      // 3. Update profiles table
      try {
        await supabase
          .from("profiles")
          .update({ full_name: fullName.trim() })
          .eq("id", user.id);
      } catch (err) {
        console.warn("Profile table update notice:", err);
      }

      setAvatarUrl(newAvatarUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccessMsg("Profile and avatar updated successfully!");
      onProfileUpdated({ full_name: fullName.trim(), avatar_url: newAvatarUrl || undefined });

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-low shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container px-6 py-4">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold tracking-widest text-on-surface uppercase font-mono">
              User Profile & Avatar
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Avatar Upload Area */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-2 border-primary/60 bg-surface-container-high overflow-hidden flex items-center justify-center shadow-lg relative">
                {currentDisplayAvatar ? (
                  <img
                    src={currentDisplayAvatar}
                    alt={fullName || "User Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold font-mono text-primary">
                    {userInitial}
                  </span>
                )}
              </div>

              {/* Hover upload trigger overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold uppercase tracking-wider gap-1 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-primary" />
                <span>Upload</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-mono font-medium transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Change Cloud Avatar</span>
            </button>
          </div>

          {/* User Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-md border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface-variant/80 cursor-not-allowed font-mono text-xs"
              />
            </div>

            {/* Read-only metadata */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg border border-outline-variant/50 bg-surface-container/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <Shield className="w-3 h-3 text-secondary" />
                  <span>Role</span>
                </div>
                <div className="mt-1 text-xs font-mono font-bold text-on-surface uppercase">
                  {profile?.role || "QA Inspector"}
                </div>
              </div>

              <div className="rounded-lg border border-outline-variant/50 bg-surface-container/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <Building2 className="w-3 h-3 text-primary" />
                  <span>Tenant</span>
                </div>
                <div className="mt-1 text-xs font-mono font-bold text-on-surface truncate">
                  {profile?.tenant_id || "default_tenant"}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
