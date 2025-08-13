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
    if (!isConfigured) {
      console.error(
        'Supabase configuration check failed - isConfigured:',
        isConfigured
      );
      throw new Error(
        'Supabase is not configured. Please check your environment variables.'
      );
    }
    if (!supabase) {
      console.error('Supabase client is null');
      throw new Error('Supabase client is not initialized.');
    }
  }

  // Helper to ensure user profile exists
  private static async ensureUserProfile(user: any): Promise<void> {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return; // Profile already exists
    }

    // Create profile if it doesn't exist
    console.log('Creating missing profile for user:', user.id);
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || null,
    });

    if (error) {
      console.error('Failed to create user profile:', error);
      throw new Error('Failed to create user profile: ' + error.message);
    }

    console.log('User profile created successfully');
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

    // Ensure user profile exists
    await this.ensureUserProfile(user);

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
    console.log('getCollections called - checkConfig starting...');
    this.checkConfig();
    console.log('checkConfig passed');

    console.log('Getting user from supabase.auth...');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log('User retrieved:', !!user, user?.id?.substring(0, 8) + '...');
    if (!user) throw new Error('User not authenticated');

    console.log('Executing collections query...');
    const { data, error } = await supabase
      .from('collections')
      .select(
        `
        *,
        creator:profiles!collections_created_by_fkey(id, email, full_name)
      `
      )
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Collections query error:', error);
      throw error;
    }

    console.log(
      'Collections query successful, got',
      data?.length || 0,
      'results'
    );
    return data || [];
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
      .select('created_by, name')
      .eq('id', data.collectionId)
      .single();

    if (collectionError) throw collectionError;
    if (collection.created_by !== user.id) {
      throw new Error('Only collection owners can invite members');
    }

    // Check if invited email corresponds to an existing user who is already a member
    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', data.email)
      .single();

    if (invitedUser) {
      // Check if this user is already a member
      const { data: existingMember } = await supabase
        .from('collection_members')
        .select('id')
        .eq('collection_id', data.collectionId)
        .eq('user_id', invitedUser.id)
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this collection');
      }
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('collection_invitations')
      .select('id')
      .eq('collection_id', data.collectionId)
      .eq('invited_email', data.email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      throw new Error('There is already a pending invitation for this email');
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
      .select(
        `
        *,
        collection:collections(name),
        inviter:profiles!collection_invitations_invited_by_fkey(full_name, email)
      `
      )
      .single();

    if (error) throw error;

    // Send invitation email
    try {
      await this.sendInvitationEmail(invitation, collection.name);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't throw error here - invitation is created, email failure shouldn't break the flow
    }

    return invitation;
  }

  // Send invitation email using Supabase Auth
  private static async sendInvitationEmail(
    invitation: any,
    collectionName: string
  ): Promise<void> {
    // Get inviter information
    const inviterName =
      invitation.inviter?.full_name || invitation.inviter?.email || 'Someone';

    const invitationLink = this.generateInvitationLink(
      invitation.invitation_token
    );

    // Use Supabase Auth to send the email
    const { error } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: invitation.invited_email,
      options: {
        data: {
          invitation_token: invitation.invitation_token,
          collection_name: collectionName,
          inviter_name: inviterName,
        },
        redirectTo: invitationLink,
      },
    });

    if (error) {
      // If admin API is not available, fall back to manual sharing
      console.warn(
        'Admin API not available, falling back to manual email handling'
      );

      // For development/production without admin access,
      // the invitation link can be shared manually or through other means
      throw new Error(
        'Email sending requires admin privileges. Please share the invitation link manually: ' +
          invitationLink
      );
    }
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
