import { supabase, isConfigured } from '../lib/supabase';
import type {
  Favorite,
  Dislike,
  NameFromJson,
  NameWithInteraction,
} from '../lib/supabase';

export class FavoritesService {
  private static checkConfig() {
    if (!isConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }
  }

  // Helper to create name identifier from NameData
  private static getNameIdentifier(
    nameText: string,
    nameGender: string
  ): string {
    return `${nameText}-${nameGender}`;
  }

  // Favorites operations
  static async addFavorite(
    nameText: string,
    nameGender: string,
    collectionId?: string,
    notes?: string
  ): Promise<Favorite> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        name_text: nameText,
        name_gender: nameGender,
        collection_id: collectionId,
        notes: notes,
        added_by: user.id,
      })
      .select(
        `
        *,
        collection:collections(*),
        added_by_user:profiles!favorites_added_by_fkey(id, email, full_name)
      `
      )
      .single();

    if (error) throw error;
    return data;
  }

  static async removeFavorite(
    nameText: string,
    nameGender: string,
    collectionId?: string
  ): Promise<void> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('name_text', nameText)
      .eq('name_gender', nameGender);

    // If collectionId is provided, only remove from that specific collection
    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }

    const { error } = await query;
    if (error) throw error;
  }

  static async getFavorites(collectionId?: string): Promise<Favorite[]> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('favorites')
      .select(
        `
        *,
        collection:collections(*),
        added_by_user:profiles!favorites_added_by_fkey(id, email, full_name)
      `
      )
      .eq('user_id', user.id);

    // Filter by collection if specified
    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  }

  static async getFavoritesForCollection(
    collectionId: string
  ): Promise<Favorite[]> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get all favorites for a collection (from all members)
    const { data, error } = await supabase
      .from('favorites')
      .select(
        `
        *,
        user:profiles!favorites_user_id_fkey(id, email, full_name),
        added_by_user:profiles!favorites_added_by_fkey(id, email, full_name)
      `
      )
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async isFavorited(
    nameText: string,
    nameGender: string,
    collectionId?: string
  ): Promise<boolean> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    let query = supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('name_text', nameText)
      .eq('name_gender', nameGender);

    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return !!data;
  }

  static async updateFavoriteNotes(
    favoriteId: string,
    notes: string
  ): Promise<Favorite> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('favorites')
      .update({ notes })
      .eq('id', favoriteId)
      .eq('user_id', user.id) // Only user can update their own notes
      .select(
        `
        *,
        collection:collections(*),
        added_by_user:profiles!favorites_added_by_fkey(id, email, full_name)
      `
      )
      .single();

    if (error) throw error;
    return data;
  }

  // Dislikes operations (unchanged)
  static async addDislike(
    nameText: string,
    nameGender: string,
    reason?: string
  ): Promise<Dislike> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('dislikes')
      .insert({
        user_id: user.id,
        name_text: nameText,
        name_gender: nameGender,
        reason,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async removeDislike(
    nameText: string,
    nameGender: string
  ): Promise<void> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('dislikes')
      .delete()
      .eq('user_id', user.id)
      .eq('name_text', nameText)
      .eq('name_gender', nameGender);

    if (error) throw error;
  }

  static async getDislikes(): Promise<Dislike[]> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('dislikes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async isDisliked(
    nameText: string,
    nameGender: string
  ): Promise<boolean> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('dislikes')
      .select('id')
      .eq('user_id', user.id)
      .eq('name_text', nameText)
      .eq('name_gender', nameGender)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return !!data;
  }

  // Combined operations
  static async getNameInteractionStatus(
    nameText: string,
    nameGender: string
  ): Promise<{
    isFavorited: boolean;
    isDisliked: boolean;
    favoriteId?: string;
    dislikeId?: string;
    collections?: string[]; // Collection IDs where this name is favorited
  }> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { isFavorited: false, isDisliked: false };
    }

    const [favoriteResult, dislikeResult] = await Promise.all([
      supabase
        .from('favorites')
        .select('id, collection_id')
        .eq('user_id', user.id)
        .eq('name_text', nameText)
        .eq('name_gender', nameGender),
      supabase
        .from('dislikes')
        .select('id')
        .eq('user_id', user.id)
        .eq('name_text', nameText)
        .eq('name_gender', nameGender)
        .maybeSingle(),
    ]);

    const favorites = favoriteResult.data || [];
    const collections = favorites
      .map((f: any) => f.collection_id)
      .filter(Boolean);

    return {
      isFavorited: favorites.length > 0,
      isDisliked: !!dislikeResult.data,
      favoriteId: favorites[0]?.id,
      dislikeId: dislikeResult.data?.id,
      collections,
    };
  }

  // Toggle operations
  static async toggleFavorite(
    nameText: string,
    nameGender: string,
    collectionId?: string,
    notes?: string
  ): Promise<{ action: 'added' | 'removed'; favorite?: Favorite }> {
    const isFavorited = await this.isFavorited(
      nameText,
      nameGender,
      collectionId
    );

    if (isFavorited) {
      await this.removeFavorite(nameText, nameGender, collectionId);
      return { action: 'removed' };
    } else {
      const favorite = await this.addFavorite(
        nameText,
        nameGender,
        collectionId,
        notes
      );
      return { action: 'added', favorite };
    }
  }

  static async toggleDislike(
    nameText: string,
    nameGender: string,
    reason?: string
  ): Promise<{ action: 'added' | 'removed'; dislike?: Dislike }> {
    const isDisliked = await this.isDisliked(nameText, nameGender);

    if (isDisliked) {
      await this.removeDislike(nameText, nameGender);
      return { action: 'removed' };
    } else {
      const dislike = await this.addDislike(nameText, nameGender, reason);
      return { action: 'added', dislike };
    }
  }

  // Get names with interaction status
  static async getNamesWithInteractionStatus(
    names: NameFromJson[]
  ): Promise<NameWithInteraction[]> {
    if (!isConfigured || !supabase) {
      return names.map((name) => ({
        ...name,
        is_favorited: false,
        is_disliked: false,
      }));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return names.map((name) => ({
        ...name,
        is_favorited: false,
        is_disliked: false,
      }));
    }

    // Get all favorites and dislikes for the user
    const [favoritesResult, dislikesResult] = await Promise.all([
      supabase
        .from('favorites')
        .select(
          'id, name_text, name_gender, collection_id, collection:collections(id, name)'
        )
        .eq('user_id', user.id),
      supabase
        .from('dislikes')
        .select('id, name_text, name_gender')
        .eq('user_id', user.id),
    ]);

    const favorites = new Map(
      favoritesResult.data?.map((f: any) => [
        this.getNameIdentifier(f.name_text, f.name_gender),
        { id: f.id, collection_id: f.collection_id, collection: f.collection },
      ]) || []
    );

    const dislikes = new Map(
      dislikesResult.data?.map((d: any) => [
        this.getNameIdentifier(d.name_text, d.name_gender),
        d.id,
      ]) || []
    );

    return names.map((name) => {
      const identifier = this.getNameIdentifier(name.name, name.sex);
      const favoriteData = favorites.get(identifier) as any;

      return {
        ...name,
        is_favorited: !!favoriteData,
        is_disliked: dislikes.has(identifier),
        favorite_id: favoriteData?.id,
        dislike_id: dislikes.get(identifier) as string | undefined,
        collections: favoriteData?.collection ? [favoriteData.collection] : [],
      };
    });
  }

  // Clear all interactions for a user (useful for testing)
  static async clearAllInteractions(): Promise<void> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    await Promise.all([
      supabase.from('favorites').delete().eq('user_id', user.id),
      supabase.from('dislikes').delete().eq('user_id', user.id),
    ]);
  }
}
