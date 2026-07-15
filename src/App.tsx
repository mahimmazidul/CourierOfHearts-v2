import { useRouter } from '@/hooks/useRouter';
import LandingPage from '@/components/pages/LandingPage';
import ComposePage from '@/components/pages/ComposePage';
import DeliveryPage from '@/components/pages/DeliveryPage';
import LetterSentPage from '@/components/pages/LetterSentPage';
import MyLettersPage from '@/components/pages/MyLettersPage';
import AdminPage from '@/components/pages/AdminPage';
import AdminLetterInfoPage from '@/components/pages/AdminLetterInfoPage';
import PolicyPage from '@/components/pages/PolicyPage';
import ThanksPage from '@/components/pages/ThanksPage';
import { FEATURE_FLAGS } from '@/config/features';

export default function App() {
  const { route, navigate } = useRouter();
  const goHome = () => navigate('/');
  const landing = (
    <LandingPage
      onCompose={() => navigate('/compose')}
      onMyLetters={() => navigate('/my-letters')}
      onAdmin={FEATURE_FLAGS.enableAdminPanel ? () => navigate(`/${FEATURE_FLAGS.adminRoute}`) : undefined}
      onPrivacy={() => navigate('/privacy')}
      onCookies={() => navigate('/cookies')}
      onThanks={() => navigate('/thanks')}
    />
  );

  switch (route.page) {
    case 'home':
      return landing;

    case 'compose':
      return (
        <ComposePage
          onLetterCreated={(slug) => navigate(`/preview/${slug}`)}
          onBack={goHome}
        />
      );

    case 'preview':
      return (
        <LetterSentPage
          slug={route.slug}
          onBack={() => navigate('/compose')}
          onPreview={(slug) => navigate(`/read/${slug}`)}
        />
      );

    case 'read':
      return <DeliveryPage slug={route.slug} onBack={goHome} />;

    case 'shared':
      return <DeliveryPage slug={route.slug} onBack={goHome} />;

    case 'my-letters':
      return (
        <MyLettersPage
          onBack={goHome}
          onCompose={() => navigate('/compose')}
          onPreview={(slug) => navigate(`/read/${slug}`)}
        />
      );

    case 'admin':
      return FEATURE_FLAGS.enableAdminPanel ? <AdminPage onBack={goHome} /> : landing;

    case 'privacy':
      return <PolicyPage kind="privacy" onBack={goHome} />;

    case 'cookies':
      return <PolicyPage kind="cookies" onBack={goHome} />;

    case 'thanks':
      return <ThanksPage onBack={goHome} />;

    case 'letter-info':
      return FEATURE_FLAGS.enableAdminPanel ? <AdminLetterInfoPage slug={route.slug} onBack={() => navigate(`/${FEATURE_FLAGS.adminRoute}`)} /> : landing;

    default:
      return landing;
  }
}
