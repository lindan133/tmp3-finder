export type QuestionMode = "auto" | "trivia" | "finalRound" | "subjective" | "vo";

export interface Choice {
  text: string;
  correct?: boolean;
  difficulty?: string;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  choices: Choice[];
  difficulty?: string;
  outro?: string;
}

export interface FinalRoundQuestion {
  id: string;
  categoryName: string;
  choices: Choice[];
  context?: string;
  triviaType?: string;
}

export interface SubtitleVersion {
  subtitle: string;
}

export interface SubjectiveQuestion {
  id: string;
  question: string;
  choices: Choice[];
  outro?: string;
  intro?: { versions: SubtitleVersion[] };
}

export interface VoVersion {
  file: string;
  subtitle: string;
}

export interface VoEntry {
  id: string;
  name: string;
  audio?: { versions: VoVersion[] };
}

export interface LoadInfo {
  files: {
    trivia: boolean;
    finalRound: boolean;
    subjective: boolean;
    vo: boolean;
  };
  warnings: string[];
  loadedAt: string;
  edition?: "demo" | "full";
  fromCache?: boolean;
}

export interface GameData {
  trivia: TriviaQuestion[];
  finalRound: FinalRoundQuestion[];
  subjective: SubjectiveQuestion[];
  vo: VoEntry[];
  counts: {
    trivia: number;
    finalRound: number;
    subjective: number;
    vo: number;
  };
  loadInfo: LoadInfo;
}

export interface PathCheckResult {
  ok: boolean;
  contentPath: string;
  files: LoadInfo["files"];
  missingRequired: string[];
  missingOptional: string[];
}

export interface TriviaSearchResult {
  type: "trivia";
  question: TriviaQuestion;
  correctAnswer: string;
  score: number;
}

export interface FinalRoundSearchResult {
  type: "finalRound";
  question: FinalRoundQuestion;
  correctAnswers: string[];
  wrongAnswers: string[];
  score: number;
}

export interface SubjectiveSearchResult {
  type: "subjective";
  question: SubjectiveQuestion;
  choices: string[];
  introLines: string[];
  score: number;
}

export interface VoSearchResult {
  type: "vo";
  entry: VoEntry;
  subtitles: string[];
  matchedSubtitle?: string;
  score: number;
}

export type SearchResult =
  | TriviaSearchResult
  | FinalRoundSearchResult
  | SubjectiveSearchResult
  | VoSearchResult;

export interface AppSettings {
  contentPath: string;
  alwaysOnTop: boolean;
  soundOnMatch: boolean;
  autoCopyOnMatch: boolean;
  theme: AppTheme;
  hotkey: string;
  language: AppLanguage;
}

export type AppTheme = "dark" | "light";

export type AppLanguage = "en" | "ru";

export interface SteamInstall {
  contentPath: string;
  edition: "demo" | "full";
  label: string;
  gameFolder: string;
}

export type ManualQuestionMode = Exclude<QuestionMode, "auto">;

export interface AutoSearchResult {
  mode: ManualQuestionMode;
  result: SearchResult;
  exact: boolean;
}
