// import React from 'react';
// import { View } from 'react-native';
// import OnboardingLayout from '../../components/OnboardingLayout';
// import FeatureItem from '../../components/FeatureItem';
// import { AlertTriangle, Camera } from 'lucide-react-native';

// export default function OnboardingScreenThree() {
//   return (
//     <OnboardingLayout
//       title="Report Safety Incidents Quickly"
//       description="Easily report safety incidents or hazards with our simple reporting tool."
//       currentPage={3}
//       totalPages={3}
//       nextRoute="/"
//     >
//       <View style={{ gap: 16 }}>
//         <FeatureItem
//           icon={<AlertTriangle size={24} color="#B03A2E" />}
//           title="Fast Reporting"
//           description="Report incidents with just a few taps"
//           iconBackgroundColor="rgba(176, 58, 46, 0.1)"
//         />
//         <FeatureItem
//           icon={<Camera size={24} color="#B03A2E" />}
//           title="Photo Evidence"
//           description="Add photos to document safety hazards"
//           iconBackgroundColor="rgba(176, 58, 46, 0.1)"
//         />
//       </View>
//     </OnboardingLayout>
//   );
// }