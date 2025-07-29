import { supabase, isConfigured } from '../lib/supabase';
import type {
  Collection,
  CollectionMember,
  CollectionInvitation,
  CollectionWithDetails,
  CollectionRole,
} from '../lib/supabase';

export class CollectionsService {
  private static checkConfig() {
    if (!isConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }
  }

  // Collection CRUD operations
  static async createCollection(data: {
    name: string;
    description?: string;
    is_public?: boolean;
  }): Promise<Collection> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: collection, error } = await supabase
      .from('collections')
      .insert({
        name: data.name,
        description: data.description,
        is_public: data.is_public || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return collection;
  }

  static async getCollections(): Promise<Collection[]> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('collections')
      .select(
        `
        *,
        creator:profiles!collections_created_by_fkey(id, email, full_name),
        members:collection_members(count),
        favorites:favorites(count)
      `
      )
      .or(`created_by.eq.${user.id},collection_members.user_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((collection: any) => ({
      ...collection,
      member_count: collection.members?.[0]?.count || 0,
      favorite_count: collection.favorites?.[0]?.count || 0,
    }));
  }

  static async getCollectionDetails(
    collectionId: string
  ): Promise<CollectionWithDetails> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get collection with all related data
    const [
      collectionResult,
      membersResult,
      favoritesResult,
      invitationsResult,
    ] = await Promise.all([
      supabase
        .from('collections')
        .select(
          `
          *,
          creator:profiles!collections_created_by_fkey(id, email, full_name)
        `
        )
        .eq('id', collectionId)
        .single(),

      supabase
        .from('collection_members')
        .select(
          `
          *,
          user:profiles!collection_members_user_id_fkey(id, email, full_name),
          inviter:profiles!collection_members_invited_by_fkey(id, email, full_name)
        `
        )
        .eq('collection_id', collectionId)
        .order('joined_at', { ascending: true }),

      supabase
        .from('favorites')
        .select(
          `
          *,
          added_by_user:profiles!favorites_added_by_fkey(id, email, full_name)
        `
        )
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false }),

      supabase
        .from('collection_invitations')
        .select(
          `
          *,
          inviter:profiles!collection_invitations_invited_by_fkey(id, email, full_name)
        `
        )
        .eq('collection_id', collectionId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    ]);

    if (collectionResult.error) throw collectionResult.error;
    if (membersResult.error) throw membersResult.error;
    if (favoritesResult.error) throw favoritesResult.error;
    if (invitationsResult.error) throw invitationsResult.error;

    // Find user's role in this collection
    const userMember = membersResult.data?.find(
      (member: any) => member.user_id === user.id
    );

    return {
      ...collectionResult.data,
      members: membersResult.data || [],
      favorites: favoritesResult.data || [],
      pending_invitations: invitationsResult.data || [],
      user_role: userMember?.role,
    };
  }

  static async updateCollection(
    collectionId: string,
    updates: { name?: string; description?: string; is_public?: boolean }
  ): Promise<Collection> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', collectionId)
      .eq('created_by', user.id) // Only owner can update
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteCollection(collectionId: string): Promise<void> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)
      .eq('created_by', user.id); // Only owner can delete

    if (error) throw error;
  }

  // Member management
  static async inviteToCollection(data: {
    collectionId: string;
    email: string;
    role?: CollectionRole;
  }): Promise<CollectionInvitation> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is owner of the collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('created_by')
      .eq('id', data.collectionId)
      .single();

    if (collectionError) throw collectionError;
    if (collection.created_by !== user.id) {
      throw new Error('Only collection owners can invite members');
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('collection_members')
      .select('id')
      .eq('collection_id', data.collectionId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      throw new Error('User is already a member of this collection');
    }

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('collection_invitations')
      .insert({
        collection_id: data.collectionId,
        invited_email: data.email,
        invited_by: user.id,
        role: data.role || 'collaborator',
      })
      .select()
      .single();

    if (error) throw error;
    return invitation;
  }

  static async acceptInvitation(
    invitationToken: string
  ): Promise<CollectionMember> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user's profile to check email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    // Find invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('collection_invitations')
      .select('*')
      .eq('invitation_token', invitationToken)
      .eq('invited_email', profile.email)
      .is('accepted_at', null)
      .single();

    if (invitationError) throw new Error('Invalid or expired invitation');

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Add user as member
    const { data: member, error: memberError } = await supabase
      .from('collection_members')
      .insert({
        collection_id: invitation.collection_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // Mark invitation as accepted
    await supabase
      .from('collection_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    return member;
  }

  static async removeMember(
    collectionId: string,
    userId: string
  ): Promise<void> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is owner of the collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('created_by')
      .eq('id', collectionId)
      .single();

    if (collectionError) throw collectionError;
    if (collection.created_by !== user.id) {
      throw new Error('Only collection owners can remove members');
    }

    const { error } = await supabase
      .from('collection_members')
      .delete()
      .eq('collection_id', collectionId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  static async leaveCollection(collectionId: string): Promise<void> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('collection_members')
      .delete()
      .eq('collection_id', collectionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  // Utility functions
  static async getUserRole(
    collectionId: string
  ): Promise<CollectionRole | null> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: member } = await supabase
      .from('collection_members')
      .select('role')
      .eq('collection_id', collectionId)
      .eq('user_id', user.id)
      .single();

    return member?.role || null;
  }

  static async getPublicCollections(limit: number = 20): Promise<Collection[]> {
    this.checkConfig();

    const { data, error } = await supabase
      .from('collections')
      .select(
        `
        *,
        creator:profiles!collections_created_by_fkey(id, full_name),
        members:collection_members(count),
        favorites:favorites(count)
      `
      )
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((collection: any) => ({
      ...collection,
      member_count: collection.members?.[0]?.count || 0,
      favorite_count: collection.favorites?.[0]?.count || 0,
    }));
  }

  static generateInvitationLink(invitationToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/collections/invite/${invitationToken}`;
  }
}
