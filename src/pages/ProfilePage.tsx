import { useCallback, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useProfile, updateProfilePhoto, deleteProfile } from "../profile/useProfile";
import { Profile } from "../profile/profileTypes";
import { usePrediction, savePrediction, deletePrediction } from "../predictions/usePrediction";
import { Prediction } from "../predictions/predictionTypes";
import { useKnockoutPrediction, saveKnockoutPrediction } from "../knockout/useKnockoutPrediction";
import { KnockoutBracket } from "../knockout/KnockoutBracket";
import { MobileKnockoutBracket } from "../knockout/MobileKnockoutBracket";
import { KnockoutPrediction } from "../knockout/knockoutTypes";
import { useSurveyResponse } from "../predictions/useSurveyResponse";
import { MESSI_RONALDO_LABEL, DEVICE_LABEL, ensurePeriod } from "../predictions/surveyLabels";
import { TeamRanker } from "../predictions/TeamRanker";
import { RankingList } from "../predictions/RankingList";
import { TEAMS, teamCrestSrc } from "../predictions/teams";
import { useImagePreload } from "@/lib/useImagePreload";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { usePlayers } from "../profile/usePlayers";
import { useResults } from "../leaderboard/useResults";
import { assignRanks } from "../leaderboard/ranking";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { MatchupPopup } from "../leaderboard/MatchupPopup";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { CameraIcon, Trash2 } from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageUnavailable } from "@/components/ui/page-unavailable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/useIsMobile";
import { useMobilePopups } from "../shell/MobilePopupHost";

type PredictionUiStep = "idle" | "rank" | "confirm-overwrite";

// Same 1100px cap the rest of the site uses (DESIGN-SPEC §0c) — this page
// isn't a wide data table like Leaderboard/Stats, so it doesn't earn their
// 1400px exception.
const PAGE_SHELL =
  "relative mx-auto flex h-full min-h-0 w-full max-w-[1100px] min-w-0 flex-1 flex-col gap-3 p-3 sm:p-6 lg:gap-5 lg:p-6";
// Two columns: profile + quiz stacked on the left, the prediction (the
// heavier, potentially-36-row content) taking the full row height on the
// right — mirrors the "tall anchor beside narrower stacked cells" rhythm
// LeaderboardPage/StatsPage already use, just mirrored left/right.
// Mobile stacks and has to divide a fixed screenful rather than let the three
// blocks size to their content. Mert's wireframe gives them 3 / 5 / 8 of its
// 16 content rows (profile / quiz / prediction), which is what the flex
// ratios on the blocks themselves encode.
const MAIN_ROW =
  "relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:grid lg:h-full lg:gap-5 lg:grid-cols-[340px_1fr] [&>*]:min-h-0 [&>*]:min-w-0";
// `contents` on mobile: the wrapper exists to group profile+quiz into
// desktop's left column, but on a phone that grouping would force the pair to
// share one flex ratio against the prediction. Dissolving it makes all three
// direct children of MAIN_ROW, so each can take the wireframe's own share.
const LEFT_COLUMN = "contents lg:flex lg:min-h-0 lg:flex-col lg:gap-5";

const TEAM_CREST_URLS = TEAMS.map((t) => teamCrestSrc(t.id));

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Average position everyone (not just one participant) predicted for each
 *  team — the small gray comparison figure beside each row's own pick. */
function computeAveragePositions(entries: { ranking: string[] }[]): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  entries.forEach((entry) => {
    entry.ranking.forEach((teamId, index) => {
      sums[teamId] = (sums[teamId] ?? 0) + (index + 1);
      counts[teamId] = (counts[teamId] ?? 0) + 1;
    });
  });
  const averages: Record<string, number> = {};
  Object.keys(sums).forEach((teamId) => {
    averages[teamId] = sums[teamId] / counts[teamId];
  });
  return averages;
}

function ProfileSkeleton() {
  return (
    <div className={PAGE_SHELL} aria-hidden data-testid="profile-skeleton">
      <div className={MAIN_ROW}>
        <div className={LEFT_COLUMN}>
          <Skeleton className="h-[180px] rounded-[var(--radius-4xl)]" />
          <Skeleton className="min-h-[140px] flex-1 rounded-[var(--radius-4xl)]" />
        </div>
        <Skeleton className="min-h-[300px] rounded-[var(--radius-4xl)]" />
      </div>
    </div>
  );
}

export function ProfilePage() {
  const isMobile = useIsMobile();
  const mobilePopups = useMobilePopups();
  const { user } = useAuth();
  const state = useVisibilityState();
  const navigate = useNavigate();
  const uid = user?.uid ?? null;

  const { profile, loading: profileLoading } = useProfile(uid);
  const { prediction, loading: predictionLoading } = usePrediction(uid);
  const { prediction: knockoutPrediction, loading: knockoutLoading } = useKnockoutPrediction(uid);
  const { response: survey, loading: surveyLoading, error: surveyError } = useSurveyResponse(uid);
  const { entries, loading: entriesLoading } = useLeaderboard();
  const { results } = useResults();
  const { players } = usePlayers();
  const phase = useTournamentPhase();
  const imageUrls = useMemo(
    () => (profile?.photoURL ? [profile.photoURL, ...TEAM_CREST_URLS] : TEAM_CREST_URLS),
    [profile?.photoURL]
  );
  const imagesReady = useImagePreload(imageUrls);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localProfile, setLocalProfile] = useState<Profile | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [predictionUiStep, setPredictionUiStep] = useState<PredictionUiStep>("idle");
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [savedPrediction, setSavedPrediction] = useState<Prediction | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const [savedKnockoutPrediction, setSavedKnockoutPrediction] = useState<KnockoutPrediction | null>(null);
  const [knockoutSubmitting, setKnockoutSubmitting] = useState(false);
  const [knockoutEditMode, setKnockoutEditMode] = useState(false);
  const [pendingKnockoutPicks, setPendingKnockoutPicks] = useState<Omit<KnockoutPrediction, "submittedAt" | "updatedAt"> | null>(null);
  const [confirmKnockoutOpen, setConfirmKnockoutOpen] = useState(false);
  const [activePredictionTab, setActivePredictionTab] = useState<"league" | "knockout">(() => {
    if (state === "loggedin_preknockout" || state === "loggedin_knockout") {
      return "knockout";
    }
    return "league";
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  // Same cross-linked-popup pattern as LeaderboardPage.tsx
  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleFixturePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedFixtureId(null);
  }, []);
  // On mobile these delegate to the shell's popup host instead of driving
  // this page's own popup state — the page's three <Popup>s aren't rendered
  // there (see the guard further down), so local state would open nothing.
  const handleSelectParticipant = useCallback(
    (participantUid: string) => {
      if (isMobile) return mobilePopups.openParticipant(participantUid);
      setSelectedUid(participantUid);
      setSelectedTeamId(null);
      setSelectedFixtureId(null);
    },
    [isMobile, mobilePopups]
  );
  const handleSelectTeam = useCallback(
    (teamId: string) => {
      if (isMobile) return mobilePopups.openTeam(teamId);
      setSelectedTeamId(teamId);
      setSelectedUid(null);
      setSelectedFixtureId(null);
    },
    [isMobile, mobilePopups]
  );
  const handleSelectFixture = useCallback(
    (fixtureId: string) => {
      if (isMobile) return mobilePopups.openFixture(fixtureId);
      setSelectedFixtureId(fixtureId);
      setSelectedTeamId(null);
      setSelectedUid(null);
    },
    [isMobile, mobilePopups]
  );

  if (!isPageAllowed("profile", state)) {
    return <PageUnavailable />;
  }

  if (profileLoading || predictionLoading || knockoutLoading || entriesLoading || !imagesReady) return <ProfileSkeleton />;

  const displayedProfile = localProfile ?? profile;
  const currentPrediction = savedPrediction ?? prediction;
  const currentKnockoutPrediction = savedKnockoutPrediction ?? knockoutPrediction;
  const predictionLocked = state !== "loggedin_notstarted";
  const isKnockoutPhaseOrPre = state === "loggedin_preknockout" || state === "loggedin_knockout";
  const averagePositions = computeAveragePositions(entries);
  const rankedEntries = assignRanks(entries);
  const myEntry = uid ? rankedEntries.find((r) => r.entry.uid === uid) : undefined;
  const selectedRanked = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;

  async function handlePhotoChange(file: File) {
    if (!uid || !displayedProfile) return;
    setPhotoSaving(true);
    setPhotoError(null);
    try {
      setLocalProfile(await updateProfilePhoto(uid, displayedProfile, file));
    } catch (err) {
      console.error("Failed to update profile photo", err);
      setPhotoError("Fotoğraf güncellenemedi, tekrar deneyin.");
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handleDeleteProfile() {
    if (!uid) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await Promise.all([deleteProfile(uid, displayedProfile?.photoURL ?? null), deletePrediction(uid)]);
      await signOut(auth);
      setDeleteConfirmOpen(false);
      navigate("/");
    } catch (err) {
      console.error("Failed to delete profile", err);
      setDeleteError("Profil silinemedi, tekrar deneyin.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={cn(PAGE_SHELL, isKnockoutPhaseOrPre && "max-w-[1400px]")}>
      <div className={MAIN_ROW}>
      <div className={LEFT_COLUMN}>
        {/* Profile card — the participant's own blurred photo as a backdrop
            behind their avatar + name, same treatment as the participant
            popup's own profile tab (ParticipantPopup.tsx). Name has no edit
            control at all — locked forever by design (PAGEMAP_SPEC.md §4). */}
        <Frame className="shrink-0 animate-cotton-rise lg:h-[180px]">
          <div className="relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden px-4 py-3 sm:px-5">
            {displayedProfile?.photoURL && (
              <img
                src={displayedProfile.photoURL}
                alt=""
                aria-hidden
                className="absolute inset-0 -z-20 size-full scale-[5] object-cover blur-2xl brightness-50"
              />
            )}
            <div className="absolute inset-0 -z-10 bg-background/60" />

            {/* Top-left: photo + name. Change-photo control sits as a badge
                on the photo's own bottom-right corner, matching the
                Avatar/AvatarBadge convention (avatar.tsx) rather than
                floating as a separate control beside the name. */}
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <Avatar size="lg" className="ring-2 ring-background">
                  <AvatarImage src={displayedProfile?.photoURL} alt="" />
                  <AvatarFallback className="bg-color_accent/20 font-mono text-sm text-color_text">
                    {displayedProfile
                      ? initials(displayedProfile.firstName, displayedProfile.lastName)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={photoSaving}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePhotoChange(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={photoSaving}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={photoSaving ? "Yükleniyor…" : "Fotoğrafı değiştir"}
                  className="absolute -right-1.5 -bottom-1.5 size-5 rounded-full border-2 border-background bg-card p-0 [&_svg]:size-2.5"
                >
                  <CameraIcon />
                </Button>
                {photoError && (
                  <p
                    role="alert"
                    className="absolute top-full left-0 z-20 mt-1 w-max max-w-[140px] text-[0.6rem] text-color_remove"
                  >
                    {photoError}
                  </p>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold tracking-[-0.01em] text-color_text">
                  {displayedProfile?.firstName} {displayedProfile?.lastName}
                </p>
              </div>

              {/* Delete lives inside the profile block on mobile, which is
                  where the wireframe puts it ("profile shit here, also has
                  delete profile button"). Desktop keeps it as its own
                  bottom-anchored column beside the prediction frame. */}
              {isMobile && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteConfirmOpen(true);
                  }}
                  aria-label="Profili sil"
                  className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-color_border1/70 text-color_remove transition-colors duration-150 active:bg-color_remove/10 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_remove"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>

            {/* Bottom-left: rank + points, same plaque-engraving mono voice
                as the leaderboard's own rank/points columns — color_accent only
                for rank 01, matching that "one earned distinction" rule.
                Meaningless before the tournament starts (nothing's ranked
                yet), so the whole block is dropped rather than shown as a
                dash pair. */}
            {predictionLocked && (
              <div className="flex items-end gap-5 pt-2 lg:pt-0">
                <div>
                  <p className="font-mono text-[0.62rem] tracking-[0.22em] text-color_textsecondary uppercase lg:text-[0.75rem]">
                    Sıra
                  </p>
                  <p
                    className={cn(
                      "font-mono text-xl font-semibold tnum lg:text-[1.91rem]",
                      myEntry?.rank === 1 ? "text-color_accent" : "text-color_text"
                    )}
                  >
                    {myEntry ? `#${myEntry.rank}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[0.62rem] tracking-[0.22em] text-color_textsecondary uppercase lg:text-[0.75rem]">
                    Puan
                  </p>
                  <p className="font-mono text-xl font-semibold text-color_text tnum lg:text-[1.91rem]">
                    {myEntry ? myEntry.entry.points : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Frame>

        {/* Quiz answers — view-only, one-time (locked at sign-up). Same
            question/answer row treatment as ParticipantPopup's own quiz
            widget, so a participant sees their answers rendered identically
            wherever they show up. */}
        <Frame className="min-h-0 flex-[5] animate-cotton-rise lg:flex-1" style={{ animationDelay: "60ms" }}>
          <FrameHeader tone="navy">
            <FrameTitle className="text-color_text">Anket Cevaplarınız</FrameTitle>
          </FrameHeader>
          <FrameBody className="min-h-0 flex-1">
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
              {survey ? (
                <div className="flex flex-col gap-3">
                  {[
                    { question: "Yaşınız", answer: String(survey.age) },
                    {
                      question: "Futbol bilginizi 1-7 arası değerlendirin",
                      answer: `${survey.footballKnowledge} / 7`,
                    },
                    {
                      question: "Messi mi Ronaldo mu?",
                      answer: MESSI_RONALDO_LABEL[survey.messiOrRonaldo],
                    },
                    { question: "Süper Lig'de tuttuğunuz takım", answer: survey.superLigTeam },
                    {
                      question: "Tuttuğunuz bir UCL takımı var mı? (varsa yazın)",
                      answer: survey.uclTeam ?? "Yok",
                    },
                    {
                      question: "Çoğunlukla hangi cihazı kullanıyorsunuz?",
                      answer: DEVICE_LABEL[survey.device],
                    },
                  ].map((row) => (
                    <div key={row.question}>
                      <p className="font-display text-sm leading-snug font-semibold text-color_text">
                        {row.question}
                      </p>
                      <p className="mt-0.5 font-display text-sm leading-snug font-light text-color_gold italic">
                        {ensurePeriod(row.answer)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : surveyError ? (
                <p className="py-2 font-display text-sm text-color_textsecondary italic">
                  Anket cevapları görüntülenemiyor.
                </p>
              ) : !surveyLoading ? (
                <p className="py-2 font-display text-sm text-color_textsecondary italic">
                  Anketi henüz doldurmadınız.
                </p>
              ) : null}
            </div>
          </FrameBody>
        </Frame>
      </div>

      {/* League prediction — view always, revise (with an overwrite
          confirmation) until it locks at league-phase start. First
          submission still happens on /predictions, not here — see
          PAGEMAP_SPEC.md §5b. The delete-profile control rides alongside it
          as a narrow, unaffiliated column of its own — outside the Frame's
          own box, bottom-anchored, the Frame shrinking to make room. */}
      <div className="flex min-h-0 min-w-0 flex-[8] gap-3 lg:flex-1">
      <Frame className="min-h-0 min-w-0 flex-1 animate-cotton-rise" style={{ animationDelay: "120ms" }}>
        <FrameHeader tone="navy">
          {isKnockoutPhaseOrPre ? (
            <div className="flex items-center gap-1 rounded-lg border border-color_border1/40 bg-background/50 p-1">
              <button
                type="button"
                onClick={() => setActivePredictionTab("league")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all cursor-pointer",
                  activePredictionTab === "league"
                    ? "bg-color_accent text-background shadow-xs"
                    : "text-color_textsecondary hover:text-color_text"
                )}
              >
                Lig Tahmini
              </button>
              <button
                type="button"
                onClick={() => setActivePredictionTab("knockout")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all cursor-pointer",
                  activePredictionTab === "knockout"
                    ? "bg-color_accent text-background shadow-xs"
                    : "text-color_textsecondary hover:text-color_text"
                )}
              >
                Eleme Tahmini
              </button>
            </div>
          ) : (
            <FrameTitle className="text-color_text">Lig Tahmininiz</FrameTitle>
          )}

          {activePredictionTab === "league" && currentPrediction && !predictionLocked && predictionUiStep === "idle" && (
            <Button
              variant="outline"
              size="sm"
              className="border-color_border1 text-color_text hover:bg-color_border1/20"
              onClick={() => {
                setPredictionError(null);
                setPredictionUiStep("rank");
              }}
            >
              Düzenle
            </Button>
          )}

          {activePredictionTab === "knockout" && state === "loggedin_preknockout" && !knockoutEditMode && (
            <Button
              variant="outline"
              size="sm"
              className="border-color_border1 text-color_text hover:bg-color_border1/20"
              onClick={() => {
                setPredictionError(null);
                setKnockoutEditMode(true);
              }}
            >
              Düzenle
            </Button>
          )}

          {activePredictionTab === "knockout" && state === "loggedin_preknockout" && knockoutEditMode && (
            <Button
              variant="outline"
              size="sm"
              className="border-color_border1 text-color_text hover:bg-color_border1/20"
              onClick={() => {
                setPredictionError(null);
                setKnockoutEditMode(false);
              }}
            >
              Vazgeç
            </Button>
          )}
        </FrameHeader>
        <FrameBody className="min-h-0 flex-1 px-4 py-3 sm:px-5">
          {activePredictionTab === "league" ? (
            currentPrediction ? (
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
                <RankingList
                  ranking={currentPrediction.ranking}
                  averagePositions={state === "loggedin_notstarted" ? undefined : averagePositions}
                  onSelectTeam={handleSelectTeam}
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-start justify-center gap-3">
                <p className="font-display text-sm text-color_textsecondary italic">
                  Henüz bir tahmin göndermediniz.
                </p>
                <Link to="/predictions" className={cn(buttonVariants({ variant: "default" }))}>
                  Tahmininizi gönderin
                </Link>
              </div>
            )
          ) : (
            <div className="no-scrollbar min-h-0 flex-1 overflow-hidden">
              {/* Desktop's bracket is the symmetric two-half one, sized to a
                  1400px page. It has no phone-width form, so mobile gets the
                  one-sided scrolling layout instead — same picks, same
                  submit path, different geometry. */}
              {isMobile ? (
                <MobileKnockoutBracket
                  key={knockoutEditMode ? "edit" : "view"}
                  initialPrediction={currentKnockoutPrediction}
                  readOnly={!knockoutEditMode}
                  submitting={knockoutSubmitting}
                  onSelectTeam={handleSelectTeam}
                  onSubmit={(data) => {
                    setPendingKnockoutPicks(data);
                    setConfirmKnockoutOpen(true);
                  }}
                />
              ) : (
                <KnockoutBracket
                  key={knockoutEditMode ? "edit" : "view"}
                  initialPrediction={currentKnockoutPrediction}
                  readOnly={!knockoutEditMode}
                  submitting={knockoutSubmitting}
                  onSelectTeam={setSelectedTeamId}
                  onSubmit={(data) => {
                    setPendingKnockoutPicks(data);
                    setConfirmKnockoutOpen(true);
                  }}
                />
              )}
            </div>
          )}
        </FrameBody>
      </Frame>

      {!isMobile && (
        <div className="flex shrink-0 flex-col justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDeleteError(null);
              setDeleteConfirmOpen(true);
            }}
            className="text-color_remove hover:text-color_remove"
          >
            Profili sil
          </Button>
        </div>
      )}
      </div>
      </div>

      {/* Mobile uses the shell's popup host — see MobilePopupHost. Rendering
          these here too would give a phone two competing dialog layers. */}
      {!isMobile && (
        <>
      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={predictionLocked}
        phase={phase}
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        onSelectFixture={handleSelectFixture}
        tournamentStarted={predictionLocked}
        phase={phase}
      />
      <MatchupPopup
        fixtureId={selectedFixtureId}
        onOpenChange={handleFixturePopupOpenChange}
        phase={phase}
        tournamentStarted={predictionLocked}
        entries={entries}
        players={players}
        results={results}
        onSelectTeam={handleSelectTeam}
        onSelectParticipant={handleSelectParticipant}
      />
        </>
      )}

      {/* Big popup for editing predictions */}
      <Dialog
        open={predictionUiStep === "rank"}
        onOpenChange={(open) => {
          if (!open) {
            setPredictionError(null);
            setPredictionUiStep("idle");
          }
        }}
      >
        {/* The width override has to carry the `sm:` prefix. DialogContent's
            own base class ends in `sm:max-w-sm`, which is emitted after any
            unprefixed max-w in the stylesheet — so the previous `max-w-5xl`
            here never actually applied above 640px and this dialog was
            rendering at ~384px on desktop, which is what made a 36-team
            ranker feel cramped and unusable. 1344px is ~3.5× that real
            width, capped to the viewport on smaller screens. */}
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[1344px] h-[88vh] max-h-[88vh] bg-background border border-color_border1/60 p-4 sm:p-6 flex flex-col min-h-0 gap-3 rounded-2xl shadow-2xl">
          <DialogHeader className="shrink-0 pb-1">
            <DialogTitle className="font-display text-lg font-bold text-color_text">
              Lig Tahmininizi Düzenleyin
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <TeamRanker
              teams={TEAMS}
              initialOrder={currentPrediction ? currentPrediction.ranking : TEAMS.map((t) => t.id)}
              onSubmit={(order) => {
                setPendingOrder(order);
                setPredictionError(null);
                setPredictionUiStep("confirm-overwrite");
              }}
            />
            {predictionError && (
              <p role="alert" className="mt-2 text-sm text-color_remove">
                {predictionError}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={predictionUiStep === "confirm-overwrite"}
        onOpenChange={(open) => {
          if (!open) {
            setPendingOrder(null);
            setPredictionError(null);
            setPredictionUiStep("idle");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emin misiniz?</DialogTitle>
            <DialogDescription>
              Bu tahmini üzerine yazmak istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          {predictionError && (
            <p role="alert" className="text-sm text-color_remove">
              {predictionError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingOrder(null);
                setPredictionError(null);
                setPredictionUiStep("idle");
              }}
            >
              Geri
            </Button>
            <Button
              onClick={async () => {
                if (!uid || !pendingOrder) return;
                try {
                  const result = await savePrediction(uid, pendingOrder);
                  setSavedPrediction(result);
                  setPendingOrder(null);
                  setPredictionError(null);
                  setPredictionUiStep("idle");
                } catch (err) {
                  console.error("Failed to update prediction", err);
                  setPredictionError("Tahmininiz kaydedilemedi, tekrar deneyin.");
                }
              }}
            >
              Tamam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmKnockoutOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPendingKnockoutPicks(null);
            setConfirmKnockoutOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emin misiniz?</DialogTitle>
            <DialogDescription>
              Eleme tahmininizi kaydetmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingKnockoutPicks(null);
                setConfirmKnockoutOpen(false);
              }}
            >
              Geri
            </Button>
            <Button
              disabled={knockoutSubmitting}
              onClick={async () => {
                if (!uid || !pendingKnockoutPicks) return;
                setKnockoutSubmitting(true);
                try {
                  const saved = await saveKnockoutPrediction(uid, pendingKnockoutPicks);
                  setSavedKnockoutPrediction(saved);
                  setPredictionError(null);
                  setKnockoutEditMode(false);
                  setConfirmKnockoutOpen(false);
                } catch (err) {
                  console.error("Failed to save knockout prediction", err);
                  setPredictionError("Tahmininiz kaydedilemedi, tekrar deneyin.");
                } finally {
                  setKnockoutSubmitting(false);
                }
              }}
            >
              {knockoutSubmitting ? "Kaydediliyor..." : "Tamam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteError(null);
            setDeleteConfirmOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profilini silmek istediğine emin misin?</DialogTitle>
            <DialogDescription>
              Bu işlem profilini ve lig tahminini kalıcı olarak siler ve oturumunu kapatır. Bu
              işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-color_remove">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => {
                setDeleteError(null);
                setDeleteConfirmOpen(false);
              }}
            >
              Vazgeç
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void handleDeleteProfile()}>
              {deleting ? "Siliniyor…" : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
