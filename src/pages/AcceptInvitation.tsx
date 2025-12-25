import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Building2, CheckCircle, XCircle } from 'lucide-react';

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

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token d\'invitation manquant');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('employees')
          .select('id, email, first_name, last_name, status, invitation_token')
          .eq('invitation_token', token)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Invitation invalide ou expirée');
        } else if (data.status === 'active') {
          setError('Ce compte a déjà été activé');
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

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (!invitation) return;

    setSubmitting(true);

    try {
      // Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            first_name: invitation.first_name,
            last_name: invitation.last_name,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Update the employee record with the user_id and activate
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            user_id: authData.user.id,
            status: 'active',
            invitation_token: null,
          })
          .eq('id', invitation.id);

        if (updateError) throw updateError;

        toast.success('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        navigate('/auth');
      }
    } catch (err: any) {
      console.error('Error creating account:', err);
      if (err.message?.includes('already registered')) {
        toast.error('Un compte existe déjà avec cette adresse email');
      } else {
        toast.error('Erreur lors de la création du compte');
      }
    } finally {
      setSubmitting(false);
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
            {error ? 'Invitation invalide' : 'Activer votre compte'}
          </CardTitle>
          <CardDescription>
            {error
              ? error
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
                    Création en cours...
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
