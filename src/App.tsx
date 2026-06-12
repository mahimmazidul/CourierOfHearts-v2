import { useRouter } from '@/hooks/useRouter';
import LandingPage from '@/components/pages/LandingPage';
import ComposePage from '@/components/pages/ComposePage';
import DeliveryPage from '@/components/pages/DeliveryPage';
import LetterSentPage from '@/components/pages/LetterSentPage';
import MyLettersPage from '@/components/pages/MyLettersPage';

export default function App() {
  const { route, navigate } = useRouter();

  switch (route.page) {
    case 'home':
      return (
        <LandingPage
          onCompose={() => navigate('/compose')}
          onMyLetters={() => navigate('/my-letters')}
        />
      );

    case 'compose':
      return (
        <ComposePage
          onLetterCreated={(slug) => navigate(`/preview/${slug}`)}
          onBack={() => navigate('/')}
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
      return (
        <DeliveryPage
          slug={route.slug}
          onBack={() => navigate('/')}
        />
      );

    case 'shared':
      return (
        <DeliveryPage
          slug={route.slug}
          onBack={() => navigate('/')}
        />
      );

    case 'my-letters':
      return (
        <MyLettersPage
          onBack={() => navigate('/')}
          onCompose={() => navigate('/compose')}
          onPreview={(slug) => navigate(`/read/${slug}`)}
        />
      );

    default:
      return (
        <LandingPage
          onCompose={() => navigate('/compose')}
          onMyLetters={() => navigate('/my-letters')}
        />
      );
  }
}
