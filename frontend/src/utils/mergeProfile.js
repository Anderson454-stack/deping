/**
 * userProfile 병합 헬퍼
 * - null/undefined 값은 기존값 유지
 * - priority, avoidance 배열은 중복 제거 후 누적
 * - 그 외 숫자 필드는 새 값으로 덮어씀
 *
 * @param {Object} prev    - 현재 userProfile
 * @param {Object} updates - API에서 받은 profileUpdates
 * @returns {Object} 병합된 새 프로필
 */
export function mergeProfile(prev, updates) {
  if (!updates) return prev;
  const next = { ...prev };
  Object.entries(updates).forEach(([key, val]) => {
    if (val === null || val === undefined) return;
    if (key === 'priority' || key === 'avoidance') {
      const arr = Array.isArray(val) ? val : [val];
      next[key] = [...new Set([...(prev[key] || []), ...arr])];
    } else {
      next[key] = val;
    }
  });
  return next;
}
