import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useProfile, updateProfilePhoto, deleteProfile } from "../profile/useProfile";
import { Profile } from "../profile/profileTypes";
import { usePrediction, savePrediction, deletePrediction } from "../predictions/usePrediction";
import { Prediction } from "../predictions/predictionTypes";
import { useSurveyResponse } from "../predictions/useSurveyResponse";
import { MESSI_RONALDO_LABEL, DEVICE_LABEL, ensurePeriod } from "../predictions/surveyLabels";
import { TeamRanker } from "../predictions/TeamRanker";
import { RankingList } from "../predictions/RankingList";
import { TEAMS } from "../predictions/teams";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useResults } from "../leaderboard/useResults";
import { evaluatePicks } from "../leaderboard/scoring";
import { assignRanks } from "../leaderboard/ranking";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { CameraIcon } from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PredictionUiStep = "idle" | "rank" | "confirm-overwrite";

// Same 1100px cap the rest of the site uses (DESIGN-SPEC §0c) — this page
// isn't a wide data table like Leaderboard/Stats, so it doesn't earn their
// 1400px exception.
const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1100px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// Two columns: profile + quiz stacked on the left, the prediction (the
// heavier, potentially-36-row content) taking the full row height on the
// right — mirrors the "tall anchor beside narrower stacked cells" rhythm
// LeaderboardPage/StatsPage already use, just mirrored left/right.
const MAIN_ROW =
  "relative z-10 grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[340px_1fr] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";
const LEFT_COLUMN = "flex min-h-0 flex-col gap-4 lg:gap-5";

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
  const { user } = useAuth();
  const state = useVisibilityState();
  const uid = user?.uid ?? null;

  const { profile, loading: profileLoading } = useProfile(uid);
  const { prediction, loading: predictionLoading } = usePrediction(uid);
  const { response: survey, loading: surveyLoading, error: surveyError } = useSurveyResponse(uid);
  const { entries, loading: entriesLoading } = useLeaderboard();
  const { results } = useResults();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localProfile, setLocalProfile] = useState<Profile | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [predictionUiStep, setPredictionUiStep] = useState<PredictionUiStep>("idle");
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [savedPrediction, setSavedPrediction] = useState<Prediction | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Same cross-linked-popup pattern as LeaderboardPage.tsx: selecting one
  // clears the other, and both are stable callbacks since ParticipantPopup/
  // TeamPopup are memoized.
  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleSelectParticipant = useCallback((participantUid: string) => {
    setSelectedUid(participantUid);
    setSelectedTeamId(null);
  }, []);
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
  }, []);

  if (!isPageAllowed("profile", state)) {
    return (
      <div className="flex h-full flex-1 items-center px-5 sm:px-8 lg:px-12">
        <p className="font-display text-2xl text-muted-foreground italic">
          This section isn't available right now.
        </p>
      </div>
    );
  }

  if (profileLoading || predictionLoading || entriesLoading) return <ProfileSkeleton />;

  const displayedProfile = localProfile ?? profile;
  const currentPrediction = savedPrediction ?? prediction;
  const predictionLocked = state !== "loggedin_notstarted";
  const averagePositions = computeAveragePositions(entries);
  const rankedEntries = assignRanks(entries);
  const myEntry = uid ? rankedEntries.find((r) => r.entry.uid === uid) : undefined;
  const selectedRanked = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;
  const correctness = currentPrediction
    ? Object.fromEntries(
        evaluatePicks(currentPrediction.ranking, results).map((p) => [p.teamId, p.correct])
      )
    : undefined;

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
      await Promise.all([deleteProfile(uid), deletePrediction(uid)]);
      await signOut(auth);
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error("Failed to delete profile", err);
      setDeleteError("Profil silinemedi, tekrar deneyin.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={PAGE_SHELL}>
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
                  <AvatarFallback className="bg-brass/20 font-mono text-sm text-ink">
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
                    className="absolute top-full left-0 z-20 mt-1 w-max max-w-[140px] text-[0.6rem] text-destructive"
                  >
                    {photoError}
                  </p>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold tracking-[-0.01em] text-ink">
                  {displayedProfile?.firstName} {displayedProfile?.lastName}
                </p>
              </div>
            </div>

            {/* Bottom-left: rank + points, same plaque-engraving mono voice
                as the leaderboard's own rank/points columns — brass only
                for rank 01, matching that "one earned distinction" rule. */}
            <div className="flex items-end gap-5">
              <div>
                <p className="font-mono text-[0.75rem] tracking-[0.22em] text-muted-foreground uppercase">
                  Sıra
                </p>
                <p
                  className={cn(
                    "font-mono text-[1.91rem] font-semibold tnum",
                    myEntry?.rank === 1 ? "text-brass" : "text-ink"
                  )}
                >
                  {myEntry ? `#${myEntry.rank}` : "—"}
                </p>
              </div>
              <div>
                <p className="font-mono text-[0.75rem] tracking-[0.22em] text-muted-foreground uppercase">
                  Puan
                </p>
                <p className="font-mono text-[1.91rem] font-semibold text-ink tnum">
                  {myEntry ? myEntry.entry.points : "—"}
                </p>
              </div>
            </div>
          </div>
        </Frame>

        {/* Quiz answers — view-only, one-time (locked at sign-up). Same
            question/answer row treatment as ParticipantPopup's own quiz
            widget, so a participant sees their answers rendered identically
            wherever they show up. */}
        <Frame className="min-h-0 flex-1 animate-cotton-rise" style={{ animationDelay: "60ms" }}>
          <FrameHeader tone="navy">
            <FrameTitle className="text-navy-ink">Anket Cevaplarınız</FrameTitle>
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
                      <p className="font-display text-sm leading-snug font-semibold text-ink">
                        {row.question}
                      </p>
                      <p className="mt-0.5 font-display text-sm leading-snug font-light text-amber-400 italic">
                        {ensurePeriod(row.answer)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : surveyError ? (
                <p className="py-2 font-display text-sm text-muted-foreground italic">
                  Anket cevapları görüntülenemiyor.
                </p>
              ) : !surveyLoading ? (
                <p className="py-2 font-display text-sm text-muted-foreground italic">
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
      <div className="flex min-h-0 min-w-0 flex-1 gap-3">
      <Frame className="min-h-0 min-w-0 flex-1 animate-cotton-rise" style={{ animationDelay: "120ms" }}>
        <FrameHeader tone="navy">
          <FrameTitle className="text-navy-ink">Lig Tahmininiz</FrameTitle>
          {currentPrediction && !predictionLocked && predictionUiStep === "idle" && (
            <Button
              variant="outline"
              size="sm"
              className="border-navy-line text-navy-ink hover:bg-navy-line/20"
              onClick={() => {
                setPredictionError(null);
                setPredictionUiStep("rank");
              }}
            >
              Düzenle
            </Button>
          )}
        </FrameHeader>
        <FrameBody className="min-h-0 flex-1 px-4 py-3 sm:px-5">
          {predictionUiStep === "rank" ? (
            <>
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
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {predictionError}
                </p>
              )}
            </>
          ) : currentPrediction ? (
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
              <RankingList
                ranking={currentPrediction.ranking}
                correctness={correctness}
                averagePositions={averagePositions}
                onSelectTeam={handleSelectTeam}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center gap-3">
              <p className="font-display text-sm text-muted-foreground italic">
                Henüz bir tahmin göndermediniz.
              </p>
              <Link to="/predictions" className={cn(buttonVariants({ variant: "default" }))}>
                Tahmininizi gönderin
              </Link>
            </div>
          )}
        </FrameBody>
      </Frame>

      <div className="flex shrink-0 flex-col justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDeleteError(null);
            setDeleteConfirmOpen(true);
          }}
          className="text-destructive hover:text-destructive"
        >
          Profili sil
        </Button>
      </div>
      </div>
      </div>

      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={handleSelectTeam}
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
      />

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
            <p role="alert" className="text-sm text-destructive">
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
              Vazgeç
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
              Evet, kaydet
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
            <p role="alert" className="text-sm text-destructive">
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
