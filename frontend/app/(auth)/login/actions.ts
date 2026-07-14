'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Use generic message to prevent user enumeration
    redirect('/login?message=' + encodeURIComponent('Invalid email or password. Please try again.'))
  }

  revalidatePath('/', 'layout')
  redirect('/') // Redirect to main dashboard after successful login
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/signup?message=' + encodeURIComponent('Registration failed. The email may already be in use.'))
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // FIXED: NEXT_PUBLIC_API_URL is the backend URL. Use NEXT_PUBLIC_SITE_URL for frontend.
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  })

  if (error) {
    redirect('/reset-password?message=' + encodeURIComponent(error.message))
  }

  redirect('/reset-password?message=Check your email for the recovery link')
}
