import { supabase } from '@/integrations/supabase/client';

interface SendEmailParams {
  type: 'invitation' | 'schedule_change' | 'time_off' | 'shift_swap' | 'commissions';
  recipientEmail: string;
  recipientName: string;
  data: Record<string, unknown>;
}

export async function sendEmail(params: SendEmailParams) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Non authentifié');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur lors de l'envoi de l'email (${response.status})`);
  }

  return response.json();
}

export async function resetEmployeePassword(employeeId: string, employeeEmail: string, employeeName: string) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Non authentifié');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ employeeId, employeeEmail, employeeName }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erreur lors de la réinitialisation du mot de passe');
  }

  return response.json();
}
