import {
  availabilityReadinessReportOutputSchema,
  classifyAvailabilityReadiness,
  serializeAvailabilityReadinessReport,
  type AvailabilityReadinessClassifierInput,
  type AvailabilityReadinessReportOutput,
} from "../../src/lib/services/availability-readiness-classifier"

export function createAvailabilityReadinessReport(
  input: AvailabilityReadinessClassifierInput
): AvailabilityReadinessReportOutput {
  const report = classifyAvailabilityReadiness(input)
  return availabilityReadinessReportOutputSchema.parse({
    report,
    canonical: serializeAvailabilityReadinessReport(report),
  })
}
