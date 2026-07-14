"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ 
  name = "password", 
  placeholder = "••••••••", 
  className 
}: { 
  name?: string, 
  placeholder?: string, 
  className?: string 
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        className={`${className} pr-10`}
        id={name}
        name={name}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#525252] hover:text-[#a3a3a3] transition-colors focus:outline-none"
        tabIndex={-1}
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
