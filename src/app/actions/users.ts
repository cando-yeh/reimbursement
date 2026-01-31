'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from './claims';
import { revalidatePath, unstable_noStore } from 'next/cache';
import { User } from '@/types';

export async function updateUser(userId: string, data: Partial<User>) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email || '' }
    });
    if (!dbUser) return { success: false, error: 'User not found in DB' };

    // Permission check
    // Only admins or the user themselves can update
    const isAdmin = dbUser.permissions?.includes('user_management');
    if (!isAdmin && dbUser.id !== userId) {
        return { success: false, error: 'Permission denied' };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                roleName: data.roleName,
                permissions: data.permissions,
                approverId: data.approverId,
                // We typically don't update email here as it comes from Auth provider
            }
        });

        revalidatePath('/admin/users');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Update User Error:', error);
        return { success: false, error: 'Update failed: ' + error.message };
    }
}

export async function deleteUser(userId: string) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email || '' }
    });
    if (!dbUser) return { success: false, error: 'User not found in DB' };

    const isAdmin = dbUser.permissions?.includes('user_management');
    if (!isAdmin) {
        return { success: false, error: 'Permission denied' };
    }

    try {
        // Prevent self-deletion if it's the last admin (logic should be in UI too but good to have here)
        if (userId === dbUser.id) {
            // Let frontend handle "logout on self delete", but backend allows it if they want.
            // But maybe safe to warn? We'll allow it for now.
        }

        await prisma.user.delete({
            where: { id: userId }
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error('Delete User Error:', error);
        return { success: false, error: 'Delete failed: ' + error.message };
    }
}

export async function getDBUsers() {
    unstable_noStore();
    console.log('[getDBUsers] Querying User table...');
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: 'asc' }
        });
        console.log(`[getDBUsers] Found ${users.length} users in DB.`);
        return { success: true, data: users };
    } catch (error: any) {
        console.error('[getDBUsers] Error:', error.message);
        return { success: false, error: 'Failed to fetch users: ' + error.message };
    }
}

export async function getDBUserByEmail(email: string) {
    unstable_noStore();
    console.log(`[getDBUserByEmail] Searching for: ${email}`);
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });
        if (user) {
            console.log(`[getDBUserByEmail] Found ${user.name}`);
        } else {
            console.log(`[getDBUserByEmail] No user found for ${email}`);
        }
        return { success: true, data: user };
    } catch (error: any) {
        console.error('[getDBUserByEmail] Error:', error.message);
        return { success: false, error: 'Failed: ' + error.message };
    }
}
