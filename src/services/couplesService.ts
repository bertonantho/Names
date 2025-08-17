import { supabase, isConfigured } from '../lib/supabase';
import type { Favorite, Dislike } from '../lib/supabase';

export interface CoupleComparisonData {
  mutualLikes: Array<{
    name_text: string;
    name_gender: string;
    leftPartner: Favorite;
    rightPartner: Favorite;
  }>;
  leftOnlyLikes: Favorite[];
  rightOnlyLikes: Favorite[];
  conflictingNames: Array<{
    name_text: string;
    name_gender: string;
    leftPartner: Favorite | Dislike;
    rightPartner: Favorite | Dislike;
    conflict: 'left_likes_right_dislikes' | 'left_dislikes_right_likes';
  }>;
  leftPartnerEmail: string;
  rightPartnerEmail: string;
}

export class CouplesService {
  private static checkConfig() {
    if (!isConfigured) {
      throw new Error(
        'Supabase is not configured. Please check your environment variables.'
      );
    }
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }
  }

  /**
   * Get partner's profile by email
   * Note: This method attempts to find a user profile by email.
   * Due to RLS policies, it may fail if the current user cannot access other profiles.
   */
  private static async getPartnerByEmail(email: string): Promise<any> {
    console.log('Looking up partner by email:', email);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase().trim())
      .single();

    console.log('Profile lookup result:', { data, error });

    if (error) {
      console.error('Profile lookup error details:', error);

      // Check if this is an RLS policy error
      if (
        error.code === 'PGRST116' ||
        error.message?.includes('row-level security')
      ) {
        throw new Error(
          `Unable to access profile for ${email}. This feature requires updated database permissions.`
        );
      }

      throw new Error(`Partner not found with email: ${email}`);
    }

    return data;
  }

  /**
   * Get favorites for a specific user
   */
  private static async getUserFavorites(userId: string): Promise<Favorite[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .is('collection_id', null); // Only personal favorites, not collection-specific ones

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get dislikes for a specific user
   */
  private static async getUserDislikes(userId: string): Promise<Dislike[]> {
    const { data, error } = await supabase
      .from('dislikes')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Compare couples' name preferences
   */
  static async compareCouplePreferences(
    leftPartnerEmail: string,
    rightPartnerEmail: string
  ): Promise<CoupleComparisonData> {
    this.checkConfig();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Get both partners' profiles
      const [leftPartner, rightPartner] = await Promise.all([
        this.getPartnerByEmail(leftPartnerEmail),
        this.getPartnerByEmail(rightPartnerEmail),
      ]);

      // Get preferences for both partners
      const [leftFavorites, leftDislikes, rightFavorites, rightDislikes] =
        await Promise.all([
          this.getUserFavorites(leftPartner.id),
          this.getUserDislikes(leftPartner.id),
          this.getUserFavorites(rightPartner.id),
          this.getUserDislikes(rightPartner.id),
        ]);

      // Create maps for efficient lookup
      const leftFavoritesMap = new Map(
        leftFavorites.map((fav) => [`${fav.name_text}-${fav.name_gender}`, fav])
      );
      const rightFavoritesMap = new Map(
        rightFavorites.map((fav) => [
          `${fav.name_text}-${fav.name_gender}`,
          fav,
        ])
      );
      const leftDislikesMap = new Map(
        leftDislikes.map((dis) => [`${dis.name_text}-${dis.name_gender}`, dis])
      );
      const rightDislikesMap = new Map(
        rightDislikes.map((dis) => [`${dis.name_text}-${dis.name_gender}`, dis])
      );

      // Find mutual likes
      const mutualLikes: CoupleComparisonData['mutualLikes'] = [];
      for (const [nameKey, leftFav] of leftFavoritesMap) {
        const rightFav = rightFavoritesMap.get(nameKey);
        if (rightFav) {
          mutualLikes.push({
            name_text: leftFav.name_text,
            name_gender: leftFav.name_gender,
            leftPartner: leftFav,
            rightPartner: rightFav,
          });
        }
      }

      // Find left-only likes (not liked by right partner)
      const leftOnlyLikes = leftFavorites.filter(
        (fav) => !rightFavoritesMap.has(`${fav.name_text}-${fav.name_gender}`)
      );

      // Find right-only likes (not liked by left partner)
      const rightOnlyLikes = rightFavorites.filter(
        (fav) => !leftFavoritesMap.has(`${fav.name_text}-${fav.name_gender}`)
      );

      // Find conflicting preferences (one likes, other dislikes)
      const conflictingNames: CoupleComparisonData['conflictingNames'] = [];

      // Check for left likes + right dislikes
      for (const [nameKey, leftFav] of leftFavoritesMap) {
        const rightDislike = rightDislikesMap.get(nameKey);
        if (rightDislike) {
          conflictingNames.push({
            name_text: leftFav.name_text,
            name_gender: leftFav.name_gender,
            leftPartner: leftFav,
            rightPartner: rightDislike,
            conflict: 'left_likes_right_dislikes',
          });
        }
      }

      // Check for left dislikes + right likes
      for (const [nameKey, leftDislike] of leftDislikesMap) {
        const rightFav = rightFavoritesMap.get(nameKey);
        if (rightFav) {
          conflictingNames.push({
            name_text: leftDislike.name_text,
            name_gender: leftDislike.name_gender,
            leftPartner: leftDislike,
            rightPartner: rightFav,
            conflict: 'left_dislikes_right_likes',
          });
        }
      }

      return {
        mutualLikes,
        leftOnlyLikes,
        rightOnlyLikes,
        conflictingNames,
        leftPartnerEmail: leftPartner.email,
        rightPartnerEmail: rightPartner.email,
      };
    } catch (error) {
      console.error('Error comparing couple preferences:', error);
      throw error;
    }
  }

  /**
   * Check if a user exists by email (for validation before comparison)
   */
  static async validatePartnerEmail(email: string): Promise<boolean> {
    this.checkConfig();

    try {
      await this.getPartnerByEmail(email);
      return true;
    } catch (error) {
      return false;
    }
  }
}
