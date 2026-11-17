import 'server-only';
import { User, connectToDatabase } from '@pathshala/db';

/**
 * A signed token can outlive its account after deletion, so a page that trusts a session
 * checks the record first. Without a database (pure unit work) the token is taken at face value.
 */
export async function accountExists(userId: string): Promise<boolean> {
  if (!process.env.MONGODB_URI) return true;
  if (!/^[a-f0-9]{24}$/i.test(userId)) return true;
  await connectToDatabase();
  return Boolean(await User.exists({ _id: userId }));
}
