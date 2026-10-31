"use client";

// Messages › Questionnaire (admins) : les réponses au questionnaire du site.
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { SurveyResults } from "@/components/admin/SurveyResults";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function QuestionnairePage() {
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/messages/questionnaire" />;
  return <SurveyResults backOffice />;
}
