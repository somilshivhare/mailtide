import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsAPI } from '../services/api.js';

/**
 * Hook containing TanStack Query v5 queries and mutations for campaigns.
 */
export const useCampaign = (campaignId = null) => {
  const queryClient = useQueryClient();

  // Query: Get all campaigns (paginated)
  const useCampaignsQuery = (page = 1, limit = 10, status = '') => {
    return useQuery({
      queryKey: ['campaigns', page, limit, status],
      queryFn: () => campaignsAPI.getAll(page, limit, status),
      keepPreviousData: true,
    });
  };

  // Query: Get single campaign detail
  const useCampaignDetailQuery = (id) => {
    return useQuery({
      queryKey: ['campaign', id],
      queryFn: () => campaignsAPI.getOne(id || campaignId),
      enabled: !!(id || campaignId),
    });
  };

  // Query: Get campaign sending progress status
  const useCampaignStatusQuery = (id, options = {}) => {
    return useQuery({
      queryKey: ['campaign-status', id],
      queryFn: () => campaignsAPI.getStatus(id || campaignId),
      enabled: !!(id || campaignId),
      refetchInterval: (query) => {
        // Stop polling when campaign is fully sent or failed/draft
        const status = query?.state?.data?.status;
        if (status === 'sent' || status === 'failed' || status === 'draft') {
          return false;
        }
        return options.refetchInterval || 5000;
      },
      ...options
    });
  };

  // Mutation: Create campaign draft
  const createCampaignMutation = useMutation({
    mutationFn: ({ title, subject, body }) => campaignsAPI.create(title, subject, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  });

  // Mutation: Update campaign draft
  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, title, subject, body }) => campaignsAPI.update(id, title, subject, body),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id] });
    }
  });

  // Mutation: Delete campaign draft
  const deleteCampaignMutation = useMutation({
    mutationFn: (id) => campaignsAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  });

  // Mutation: Trigger sending campaign
  const sendCampaignMutation = useMutation({
    mutationFn: (id) => campaignsAPI.send(id || campaignId),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-status', id] });
    }
  });

  // Mutation: Resend to non-openers
  const resendNonOpenersMutation = useMutation({
    mutationFn: (id) => campaignsAPI.resendNonOpeners(id || campaignId),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-status', id] });
    }
  });

  return {
    useCampaignsQuery,
    useCampaignDetailQuery,
    useCampaignStatusQuery,
    createCampaignMutation,
    updateCampaignMutation,
    deleteCampaignMutation,
    sendCampaignMutation,
    resendNonOpenersMutation
  };
};
export default useCampaign;
