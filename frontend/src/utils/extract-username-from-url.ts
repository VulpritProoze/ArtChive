/**
 * Extracts username from URL parameter, removing @ symbol if present.
 * 
 * React Router v6 captures the entire segment including @ as the parameter value.
 * This utility normalizes it by stripping the @ symbol.
 * 
 * @param usernameParam - The username parameter from useParams (may include @)
 * @returns The username without @ symbol, or undefined if param is undefined
 * 
 * @example
 * extractUsernameFromUrl('@johndoe') // returns 'johndoe'
 * extractUsernameFromUrl('johndoe') // returns 'johndoe'
 * extractUsernameFromUrl(undefined) // returns undefined
 */
export const extractUsernameFromUrl = (usernameParam: string | undefined): string | undefined => {
  if (!usernameParam) {
    return undefined;
  }
  
  return usernameParam.startsWith('@') ? usernameParam.substring(1) : usernameParam;
};

