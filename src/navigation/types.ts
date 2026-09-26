export type RootTabParamList = {
  Start: undefined;
  Poznaj: undefined;
  Plany: undefined;
  Grupy: undefined;
  Profil: undefined;
};

export type TabName = keyof RootTabParamList;

export type MinimalAccount = {
  city?: string | null;
  zodiac?: string | null;
  style?: string | null;
  [key: string]: unknown;
};

export type FeaturePreferences = {
  zodiacPeopleMatching?: boolean;
  zodiacSign?: string | null;
  stylePeopleMatching?: boolean;
  stylePreference?: string | null;
  polkaCare?: boolean;
  cycleCloudSync?: boolean;
  supportChat?: boolean;
  [key: string]: unknown;
};
