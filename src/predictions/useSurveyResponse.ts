import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SurveyResponse } from "./surveyTypes";

export async function saveSurveyResponse(uid: string, response: SurveyResponse): Promise<void> {
  await setDoc(doc(db, "surveyResponses", uid), response);
}
