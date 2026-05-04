import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchPlanningTimeline,
    PlanningTimelineFilters,
    previewPlanningPublication,
    PublishPlanningPeriod,
    publishPlanningPeriod
} from '../api/planning.api';
import {
    invalidatePlanningResolutionQueries,
    planningQueryKeys,
    queryCacheProfiles,
} from '../api/queryKeys';

export const usePlanningPublicationPreview = (period: PublishPlanningPeriod, enabled = true) => {
    return useQuery({
        queryKey: planningQueryKeys.publication.preview(period),
        queryFn: () => previewPlanningPublication(period),
        enabled: enabled && Boolean(period.start && period.end),
        ...queryCacheProfiles.live,
    });
};

export const usePublishPlanningPeriod = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: publishPlanningPeriod,
        onSuccess: () => {
            return invalidatePlanningResolutionQueries(queryClient);
        }
    });
};

export const usePlanningComplianceTimeline = (filters: PlanningTimelineFilters, enabled = true) => {
    return useQuery({
        queryKey: planningQueryKeys.compliance.timeline(filters),
        queryFn: () => fetchPlanningTimeline(filters),
        enabled: enabled && Boolean(filters.from || filters.to || filters.agentId || filters.shiftId),
        ...queryCacheProfiles.auditTrail,
    });
};
