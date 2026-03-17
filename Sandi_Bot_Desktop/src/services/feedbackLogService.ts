import { getDb } from './db';

export interface STZInteractionLog {
  session_id: string;
  client_id: string;
  session_number?: number;
  pipeline_stage?: string;
  outcome_bucket?: string;

  l1?: {
    prompt_quality_score?: number;
    vocabulary_match?: boolean;
    output_grade?: 'A' | 'B' | 'C';
    edge_case_triggered?: boolean;
    edge_case_type?: string;
    reasoning_chain_present?: boolean;
    source_documents?: string[];
  };

  l2?: {
    skills_invoked?: string[];
    readiness_identity?: number;
    readiness_commitment?: number;
    readiness_financial?: number;
    readiness_execution?: number;
    readiness_composite?: number;
    flag_detected?: boolean;
    flag_types?: string[];
    flag_count?: number;
    hesitation_type?: string;
    spouse_alignment_status?: string;
    days_in_stage?: number;
    session_engagement_quality?: string;
  };

  l3?: {
    agent_triggered?: string;
    workflow_completed?: boolean;
    workflow_steps_completed?: number;
    workflow_steps_total?: number;
    human_interrupt_point?: string;
    time_to_ready_seconds?: number;
    documents_processed?: string[];
  };

  l4?: {
    approval_required?: boolean;
    approval_given?: boolean;
    modification_made?: boolean;
    modification_rationale?: string;
    confidence_score?: number;
    completeness_gate_status?: string;
    missing_documents?: string[];
    handoff_triggered?: boolean;
    handoff_reason?: string;
    recommendation_label?: string;
    recommendation_reasons?: string[];
  };

  l5?: {
    rubric_clear?: number;
    rubric_flag_detection?: number;
    rubric_question_quality?: number;
    rubric_outcome_signal?: number;
    rubric_methodology?: number;
    rubric_composite?: number;
    correction_scope?: 'once' | 'retrain' | 'flag';
    zone_signal_rating?: number;
    review_triggered?: boolean;
    passive_accept?: boolean;
    prep_time_minutes?: number;
    coaching_self_score?: number;
    coach_note?: string;
  };
}

function getCurrentStudyWeek(): number {
  const studyStart = new Date('2026-03-17');
  const now = new Date();
  const diffMs = now.getTime() - studyStart.getTime();
  const diffWeeks = Math.floor(
    diffMs / (7 * 24 * 60 * 60 * 1000)
  );
  return Math.max(1, diffWeeks + 1);
}

export async function logInteraction(
  log: STZInteractionLog
): Promise<boolean> {
  try {
    const db = await getDb();

    await db.execute(
      `INSERT INTO stz_feedback_log (
        session_id, client_id, session_number,
        pipeline_stage, outcome_bucket,
        l1_prompt_quality_score, l1_vocabulary_match,
        l1_output_grade, l1_edge_case_triggered,
        l1_edge_case_type, l1_reasoning_chain_present,
        l1_source_documents,
        l2_skills_invoked, l2_readiness_identity,
        l2_readiness_commitment, l2_readiness_financial,
        l2_readiness_execution, l2_readiness_composite,
        l2_flag_detected, l2_flag_types, l2_flag_count,
        l2_hesitation_type, l2_spouse_alignment_status,
        l2_days_in_stage, l2_session_engagement_quality,
        l3_agent_triggered, l3_workflow_completed,
        l3_workflow_steps_completed, l3_workflow_steps_total,
        l3_human_interrupt_point, l3_time_to_ready_seconds,
        l3_documents_processed,
        l4_approval_required, l4_approval_given,
        l4_modification_made, l4_modification_rationale,
        l4_confidence_score, l4_completeness_gate_status,
        l4_missing_documents, l4_handoff_triggered,
        l4_handoff_reason, l4_recommendation_label,
        l4_recommendation_reasons,
        l5_rubric_clear, l5_rubric_flag_detection,
        l5_rubric_question_quality, l5_rubric_outcome_signal,
        l5_rubric_methodology, l5_rubric_composite,
        l5_correction_scope, l5_zone_signal_rating,
        l5_review_triggered, l5_passive_accept,
        l5_prep_time_minutes, l5_coaching_self_score,
        l5_coach_note,
        study_week, study_phase
      ) VALUES (
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?
      )`,
      [
        log.session_id,
        log.client_id,
        log.session_number ?? null,
        log.pipeline_stage ?? null,
        log.outcome_bucket ?? null,
        log.l1?.prompt_quality_score ?? null,
        log.l1?.vocabulary_match ? 1 : 0,
        log.l1?.output_grade ?? null,
        log.l1?.edge_case_triggered ? 1 : 0,
        log.l1?.edge_case_type ?? null,
        log.l1?.reasoning_chain_present !== false ? 1 : 0,
        JSON.stringify(log.l1?.source_documents ?? []),
        JSON.stringify(log.l2?.skills_invoked ?? []),
        log.l2?.readiness_identity ?? null,
        log.l2?.readiness_commitment ?? null,
        log.l2?.readiness_financial ?? null,
        log.l2?.readiness_execution ?? null,
        log.l2?.readiness_composite ?? null,
        log.l2?.flag_detected ? 1 : 0,
        JSON.stringify(log.l2?.flag_types ?? []),
        log.l2?.flag_count ?? 0,
        log.l2?.hesitation_type ?? null,
        log.l2?.spouse_alignment_status ?? null,
        log.l2?.days_in_stage ?? null,
        log.l2?.session_engagement_quality ?? null,
        log.l3?.agent_triggered ?? null,
        log.l3?.workflow_completed ? 1 : 0,
        log.l3?.workflow_steps_completed ?? null,
        log.l3?.workflow_steps_total ?? null,
        log.l3?.human_interrupt_point ?? null,
        log.l3?.time_to_ready_seconds ?? null,
        JSON.stringify(log.l3?.documents_processed ?? []),
        log.l4?.approval_required ? 1 : 0,
        log.l4?.approval_given != null
          ? (log.l4.approval_given ? 1 : 0) : null,
        log.l4?.modification_made ? 1 : 0,
        log.l4?.modification_rationale ?? null,
        log.l4?.confidence_score ?? null,
        log.l4?.completeness_gate_status ?? null,
        JSON.stringify(log.l4?.missing_documents ?? []),
        log.l4?.handoff_triggered ? 1 : 0,
        log.l4?.handoff_reason ?? null,
        log.l4?.recommendation_label ?? null,
        JSON.stringify(log.l4?.recommendation_reasons ?? []),
        log.l5?.rubric_clear ?? null,
        log.l5?.rubric_flag_detection ?? null,
        log.l5?.rubric_question_quality ?? null,
        log.l5?.rubric_outcome_signal ?? null,
        log.l5?.rubric_methodology ?? null,
        log.l5?.rubric_composite ?? null,
        log.l5?.correction_scope ?? null,
        log.l5?.zone_signal_rating ?? null,
        log.l5?.review_triggered ? 1 : 0,
        log.l5?.passive_accept ? 1 : 0,
        log.l5?.prep_time_minutes ?? null,
        log.l5?.coaching_self_score ?? null,
        log.l5?.coach_note ?? null,
        getCurrentStudyWeek(),
        'baseline'
      ]
    );
    return true;
  } catch (error) {
    console.error('STZ feedback log error:', error);
    return false;
  }
}

export async function updateL5Signals(
  sessionId: string,
  l5: STZInteractionLog['l5']
): Promise<boolean> {
  try {
    const db = await getDb();
    await db.execute(
      `UPDATE stz_feedback_log SET
        l5_rubric_clear = ?,
        l5_rubric_flag_detection = ?,
        l5_rubric_question_quality = ?,
        l5_rubric_outcome_signal = ?,
        l5_rubric_methodology = ?,
        l5_rubric_composite = ?,
        l5_correction_scope = ?,
        l5_zone_signal_rating = ?,
        l5_prep_time_minutes = ?,
        l5_coaching_self_score = ?,
        l5_coach_note = ?
      WHERE session_id = ?`,
      [
        l5?.rubric_clear ?? null,
        l5?.rubric_flag_detection ?? null,
        l5?.rubric_question_quality ?? null,
        l5?.rubric_outcome_signal ?? null,
        l5?.rubric_methodology ?? null,
        l5?.rubric_composite ?? null,
        l5?.correction_scope ?? null,
        l5?.zone_signal_rating ?? null,
        l5?.prep_time_minutes ?? null,
        l5?.coaching_self_score ?? null,
        l5?.coach_note ?? null,
        sessionId
      ]
    );
    return true;
  } catch (error) {
    console.error('STZ L5 update error:', error);
    return false;
  }
}
