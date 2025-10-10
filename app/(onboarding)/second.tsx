// import React from 'react';
// import { View } from 'react-native';
// import OnboardingLayout from '../../components/OnboardingLayout';
// import FeatureItem from '../../components/FeatureItem';
// import { Award, Download } from 'lucide-react-native';

// export default function OnboardingScreenTwo() {
//   return (
//     <OnboardingLayout
//       title="Manage Your Certifications"
//       description="Keep track of all your safety certifications in one place and get alerts before they expire."
//       currentPage={2}
//       totalPages={3}
//       nextRoute="/(onboarding)/third"
//       skipRoute="/"
//     >
//       <View style={{ gap: 16 }}>
//         <FeatureItem
//           icon={<Award size={24} color="#1B365D" />}
//           title="Digital Certificates"
//           description="All your certifications in one secure location"
//           iconBackgroundColor="rgba(27, 54, 93, 0.1)"
//         />
//         <FeatureItem
//           icon={<Download size={24} color="#1B365D" />}
//           title="Easy Sharing"
//           description="Share your certifications with supervisors or employers"
//           iconBackgroundColor="rgba(27, 54, 93, 0.1)"
//         />
//       </View>
//     </OnboardingLayout>
//   );
// }