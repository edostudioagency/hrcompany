import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Building2, CheckCircle, XCircle, LogIn, KeyRound } from 'lucide-react';

interface InvitationData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [existingAccount, setExistingAccount] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token d\'invitation manquant');
        setLoading(false);
        return;
      }

      try {
        // Call the edge function to validate the token (bypasses RLS)
        const { data, error: invokeError } = await supabase.functions.invoke('validate-invitation', {
          body: { token },
        });

        if (invokeError) {
          console.error('Error invoking validate-invitation:', invokeError);
          setError('Erreur lors de la validation de l\'invitation');
          return;
        }

        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data);
        }
      } catch (err) {
        console.error('Error validating token:', err);
        setError('Erreur lors de la validation de l\'invitation');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (!invitation || !token) return;

    setSubmitting(true);

    try {
      // Call the edge function to activate the account
      const { data, error: invokeError } = await supabase.functions.invoke('activate-account', {
        body: { token, password },
      });

      if (invokeError) {
        console.error('Error invoking activate-account:', invokeError);
        toast.error('Erreur lors de l\'activation du compte');
        return;
      }

      if (data.error) {
        if (data.existingAccount) {
          setExistingAccount(true);
          toast.info('Un compte existe déjà avec cette adresse email. Veuillez vous connecter.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success('Compte activé avec succès ! Vous pouvez maintenant vous connecter.');
      navigate('/auth');
    } catch (err: any) {
      console.error('Error activating account:', err);
      toast.error('Erreur lors de l\'activation du compte');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginWithExistingAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    setSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (signInError) throw signInError;

      toast.success('Connexion réussie ! Votre compte est maintenant lié.');
      navigate('/');
    } catch (err: any) {
      console.error('Error signing in:', err);
      if (err.message?.includes('Invalid login credentials')) {
        toast.error('Mot de passe incorrect');
      } else {
        toast.error('Erreur lors de la connexion');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!invitation) return;

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(invitation.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success(`Un email de réinitialisation a été envoyé à ${invitation.email}`);
    } catch (err: any) {
      console.error('Error sending reset email:', err);
      toast.error("Erreur lors de l'envoi de l'email de réinitialisation");
    } finally {
      setSendingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>
            {error ? 'Invitation invalide' : existingAccount ? 'Connectez-vous' : 'Activer votre compte'}
          </CardTitle>
          <CardDescription>
            {error
              ? error
              : existingAccount
              ? `Un compte existe déjà pour ${invitation?.email}. Entrez votre mot de passe pour vous connecter.`
              : `Bienvenue ${invitation?.first_name} ! Créez votre mot de passe pour accéder à l'application.`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="text-center space-y-4">
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <Button asChild>
                <Link to="/auth">Aller à la connexion</Link>
              </Button>
            </div>
          ) : existingAccount && invitation ? (
            <div className="space-y-4">
              <form onSubmit={handleLoginWithExistingAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={invitation.email} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe existant"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Se connecter
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center mb-3">
                  Mot de passe oublié ?
                </p>
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full" 
                  onClick={handleForgotPassword}
                  disabled={sendingReset}
                >
                  {sendingReset ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Réinitialiser mon mot de passe
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : invitation ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={invitation.email} disabled className="bg-muted" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={invitation.first_name} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={invitation.last_name} disabled className="bg-muted" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activation en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Activer mon compte
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Vous avez déjà un compte ?{' '}
                <Link to="/auth" className="text-primary hover:underline">
                  Se connecter
                </Link>
              </p>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
