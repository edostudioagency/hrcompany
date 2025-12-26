import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Lock, CheckCircle, XCircle } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" });

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      // First, handle the hash parameters if present (from email link)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && refreshToken && type === 'recovery') {
        // Set the session from the recovery link
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Error setting session:', error);
          setErrorMessage("Lien de réinitialisation invalide ou expiré");
          setIsValidSession(false);
          return;
        }

        // Clear the hash from URL for cleaner display
        window.history.replaceState(null, '', window.location.pathname);
        setIsValidSession(true);
        return;
      }

      // Check if there's already an active session (user came from recovery link that was auto-processed)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsValidSession(true);
      } else {
        setErrorMessage("Aucune session active. Veuillez utiliser le lien de réinitialisation envoyé par email.");
        setIsValidSession(false);
      }
    };

    checkSession();
  }, []);

  // Link employee to user after successful authentication
  const linkEmployeeToUser = async (userId: string, email: string) => {
    try {
      // Check if an employee with this email exists but isn't linked yet
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('id, user_id, status')
        .eq('email', email)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching employee:', fetchError);
        return;
      }

      // If employee exists and is not yet linked, link them
      if (employee && !employee.user_id) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            user_id: userId,
            status: 'active',
            invitation_token: null,
          })
          .eq('id', employee.id);

        if (updateError) {
          console.error('Error linking employee:', updateError);
        } else {
          console.log('Employee linked successfully');
        }
      }
    } catch (error) {
      console.error('Error in linkEmployeeToUser:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      setIsLoading(false);
      console.error('Error updating password:', error);
      if (error.message?.includes('same_password')) {
        toast.error("Le nouveau mot de passe doit être différent de l'ancien");
      } else {
        toast.error("Impossible de mettre à jour le mot de passe: " + error.message);
      }
    } else {
      // Get current session to link employee
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await linkEmployeeToUser(session.user.id, session.user.email || '');
      }
      
      setIsLoading(false);
      setIsSuccess(true);
      toast.success("Mot de passe mis à jour avec succès !");
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid session / error state
  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>
              {errorMessage || "Ce lien de réinitialisation n'est pas valide ou a expiré"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Retourner à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Mot de passe mis à jour</CardTitle>
            <CardDescription>
              Redirection vers l'application...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe sécurisé
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 6 caractères
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Mettre à jour le mot de passe"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
