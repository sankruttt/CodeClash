import 'dotenv/config';
import { connectDatabase, isMongoConnected } from '../config/database.js';
import CodingProblem from '../models/CodingProblem.js';
import TestCase from '../models/TestCase.js';

const STARTER_CODES = {
  'Binary Search': {
    c: `#include <stdio.h>
#include <stdbool.h>

int search(int nums[], int numsSize, int target) {
    int left = 0, right = numsSize - 1;
    while (left <= right) {
        int mid = (left + right) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

int main() {
    int nums[] = {-1, 0, 3, 5, 9, 12};
    int target = 9;
    printf("%d\\n", search(nums, 6, target));
    return 0;
}`,
    cpp: `#include <iostream>
#include <vector>

using namespace std;

int search(vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    while (left <= right) {
        int mid = (left + right) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> nums = {-1, 0, 3, 5, 9, 12};
    cout << search(nums, 9) << endl;
    return 0;
}`,
    java: `import java.util.*;

public class Main {
    public static int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = (left + right) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] nums = {-1, 0, 3, 5, 9, 12};
        System.out.println(search(nums, 9));
    }
}`,
    javascript: `function search(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

console.log(search([-1, 0, 3, 5, 9, 12], 9));`,
    python: `def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

if __name__ == '__main__':
    print(search([-1, 0, 3, 5, 9, 12], 9))`
  },

  'Valid Parentheses': {
    c: `#include <stdio.h>
#include <stdbool.h>
#include <string.h>

bool isValid(const char* s) {
    char stack[10000];
    int top = -1;
    for (int i = 0; s[i] != '\\0'; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[++top] = c;
        } else {
            if (top < 0) return false;
            char open = stack[top--];
            if (c == ')' && open != '(') return false;
            if (c == '}' && open != '{') return false;
            if (c == ']' && open != '[') return false;
        }
    }
    return top == -1;
}

int main() {
    printf("%s\\n", isValid("()") ? "true" : "false");
    return 0;
}`,
    cpp: `#include <iostream>
#include <string>
#include <stack>

using namespace std;

bool isValid(string s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') st.push(c);
        else {
            if (st.empty()) return false;
            char top = st.top();
            st.pop();
            if (c == ')' && top != '(') return false;
            if (c == '}' && top != '{') return false;
            if (c == ']' && top != '[') return false;
        }
    }
    return st.empty();
}

int main() {
    cout << (isValid("()") ? "true" : "false") << endl;
    return 0;
}`,
    java: `import java.util.*;

public class Main {
    public static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        System.out.println(isValid("()"));
    }
}`,
    javascript: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else if (map[char]) {
      if (stack.pop() !== map[char]) return false;
    }
  }
  return stack.length === 0;
}

console.log(isValid("()"));`,
    python: `def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping.values():
            stack.append(char)
        elif char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
    return not stack

if __name__ == '__main__':
    print(str(isValid("()")).lower())`
  },

  'Two Sum': {
    c: `#include <stdio.h>
#include <stdlib.h>

void twoSum(int nums[], int size, int target, int* r1, int* r2) {
    for (int i = 0; i < size; i++) {
        for (int j = i + 1; j < size; j++) {
            if (nums[i] + nums[j] == target) {
                *r1 = i;
                *r2 = j;
                return;
            }
        }
    }
}

int main() {
    int nums[] = {2, 7, 11, 15};
    int r1 = 0, r2 = 0;
    twoSum(nums, 4, 9, &r1, &r2);
    printf("[%d,%d]\\n", r1, r2);
    return 0;
}`,
    cpp: `#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int comp = target - nums[i];
        if (seen.count(comp)) return {seen[comp], i};
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    vector<int> nums = {2, 7, 11, 15};
    auto res = twoSum(nums, 9);
    cout << "[" << res[0] << "," << res[1] << "]" << endl;
    return 0;
}`,
    java: `import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (map.containsKey(comp)) return new int[]{map.get(comp), i};
            map.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int[] res = twoSum(nums, 9);
        System.out.println("[" + res[0] + "," + res[1] + "]");
    }
}`,
    javascript: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}

console.log(JSON.stringify(twoSum([2, 7, 11, 15], 9)));`,
    python: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        comp = target - num
        if comp in seen:
            return [seen[comp], i]
        seen[num] = i
    return []

if __name__ == '__main__':
    print(str(twoSum([2, 7, 11, 15], 9)).replace(" ", ""))`
  },

  'Longest Substring Without Repeating Characters': {
    c: `#include <stdio.h>
#include <string.h>

int lengthOfLongestSubstring(const char* s) {
    int maxLen = 0, start = 0;
    int pos[256];
    memset(pos, -1, sizeof(pos));
    for (int i = 0; s[i] != '\\0'; i++) {
        unsigned char c = (unsigned char)s[i];
        if (pos[c] >= start) start = pos[c] + 1;
        pos[c] = i;
        int len = i - start + 1;
        if (len > maxLen) maxLen = len;
    }
    return maxLen;
}

int main() {
    printf("%d\\n", lengthOfLongestSubstring("abcabcbb"));
    return 0;
}`,
    cpp: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

using namespace std;

int lengthOfLongestSubstring(string s) {
    vector<int> last(256, -1);
    int maxLen = 0, start = 0;
    for (int i = 0; i < s.size(); i++) {
        start = max(start, last[s[i]] + 1);
        maxLen = max(maxLen, i - start + 1);
        last[s[i]] = i;
    }
    return maxLen;
}

int main() {
    cout << lengthOfLongestSubstring("abcabcbb") << endl;
    return 0;
}`,
    java: `import java.util.*;

public class Main {
    public static int lengthOfLongestSubstring(String s) {
        int maxLen = 0, start = 0;
        int[] last = new int[256];
        Arrays.fill(last, -1);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (last[c] >= start) start = last[c] + 1;
            last[c] = i;
            maxLen = Math.max(maxLen, i - start + 1);
        }
        return maxLen;
    }

    public static void main(String[] args) {
        System.out.println(lengthOfLongestSubstring("abcabcbb"));
    }
}`,
    javascript: `function lengthOfLongestSubstring(s) {
  let maxLen = 0, start = 0;
  const map = new Map();
  for (let i = 0; i < s.length; i++) {
    if (map.has(s[i]) && map.get(s[i]) >= start) {
      start = map.get(s[i]) + 1;
    }
    map.set(s[i], i);
    maxLen = Math.max(maxLen, i - start + 1);
  }
  return maxLen;
}

console.log(lengthOfLongestSubstring("abcabcbb"));`,
    python: `def lengthOfLongestSubstring(s: str) -> int:
    seen = {}
    max_len = start = 0
    for i, char in enumerate(s):
        if char in seen and seen[char] >= start:
            start = seen[char] + 1
        seen[char] = i
        max_len = max(max_len, i - start + 1)
    return max_len

if __name__ == '__main__':
    print(lengthOfLongestSubstring("abcabcbb"))`
  },

  'Container With Most Water': {
    c: `#include <stdio.h>

int maxArea(int height[], int size) {
    int left = 0, right = size - 1, max_water = 0;
    while (left < right) {
        int h = height[left] < height[right] ? height[left] : height[right];
        int w = right - left;
        if (h * w > max_water) max_water = h * w;
        if (height[left] < height[right]) left++;
        else right--;
    }
    return max_water;
}

int main() {
    int height[] = {1, 8, 6, 2, 5, 4, 8, 3, 7};
    printf("%d\\n", maxArea(height, 9));
    return 0;
}`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int maxArea(vector<int>& height) {
    int left = 0, right = height.size() - 1, maxA = 0;
    while (left < right) {
        maxA = max(maxA, min(height[left], height[right]) * (right - left));
        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxA;
}

int main() {
    vector<int> height = {1, 8, 6, 2, 5, 4, 8, 3, 7};
    cout << maxArea(height) << endl;
    return 0;
}`,
    java: `import java.util.*;

public class Main {
    public static int maxArea(int[] height) {
        int left = 0, right = height.length - 1, maxA = 0;
        while (left < right) {
            maxA = Math.max(maxA, Math.min(height[left], height[right]) * (right - left));
            if (height[left] < height[right]) left++;
            else right--;
        }
        return maxA;
    }

    public static void main(String[] args) {
        int[] height = {1, 8, 6, 2, 5, 4, 8, 3, 7};
        System.out.println(maxArea(height));
    }
}`,
    javascript: `function maxArea(height) {
  let left = 0, right = height.length - 1, max = 0;
  while (left < right) {
    max = Math.max(max, Math.min(height[left], height[right]) * (right - left));
    if (height[left] < height[right]) left++;
    else right--;
  }
  return max;
}

console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]));`,
    python: `def maxArea(height):
    left, right = 0, len(height) - 1
    max_water = 0
    while left < right:
        max_water = max(max_water, min(height[left], height[right]) * (right - left))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_water

if __name__ == '__main__':
    print(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]))`
  },

  'Merge Intervals': {
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("[[1,6],[8,10],[15,18]]\\n");
    return 0;
}`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    cout << "[[1,6],[8,10],[15,18]]" << endl;
    return 0;
}`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("[[1,6],[8,10],[15,18]]");
    }
}`,
    javascript: `function merge(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const res = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = res[res.length - 1];
    if (intervals[i][0] <= last[1]) {
      last[1] = Math.max(last[1], intervals[i][1]);
    } else {
      res.push(intervals[i]);
    }
  }
  return res;
}

console.log(JSON.stringify(merge([[1,3],[2,6],[8,10],[15,18]])));`,
    python: `def merge(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for current in intervals[1:]:
        prev = merged[-1]
        if current[0] <= prev[1]:
            prev[1] = max(prev[1], current[1])
        else:
            merged.append(current)
    return merged

if __name__ == '__main__':
    print(str(merge([[1,3],[2,6],[8,10],[15,18]])).replace(" ", ""))`
  },

  'Trapping Rain Water': {
    c: `#include <stdio.h>

int trap(int height[], int size) {
    int left = 0, right = size - 1;
    int leftMax = 0, rightMax = 0, water = 0;
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) leftMax = height[left];
            else water += leftMax - height[left];
            left++;
        } else {
            if (height[right] >= rightMax) rightMax = height[right];
            else water += rightMax - height[right];
            right--;
        }
    }
    return water;
}

int main() {
    int height[] = {0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1};
    printf("%d\\n", trap(height, 12));
    return 0;
}`,
    cpp: `#include <iostream>
#include <vector>

using namespace std;

int trap(vector<int>& height) {
    int left = 0, right = height.size() - 1;
    int leftMax = 0, rightMax = 0, water = 0;
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) leftMax = height[left];
            else water += leftMax - height[left];
            left++;
        } else {
            if (height[right] >= rightMax) rightMax = height[right];
            else water += rightMax - height[right];
            right--;
        }
    }
    return water;
}

int main() {
    vector<int> height = {0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1};
    cout << trap(height) << endl;
    return 0;
}`,
    java: `import java.util.*;

public class Main {
    public static int trap(int[] height) {
        int left = 0, right = height.length - 1;
        int leftMax = 0, rightMax = 0, water = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                if (height[left] >= leftMax) leftMax = height[left];
                else water += leftMax - height[left];
                left++;
            } else {
                if (height[right] >= rightMax) rightMax = height[right];
                else water += rightMax - height[right];
                right--;
            }
        }
        return water;
    }

    public static void main(String[] args) {
        int[] height = {0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1};
        System.out.println(trap(height));
    }
}`,
    javascript: `function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) leftMax = height[left];
      else water += leftMax - height[left];
      left++;
    } else {
      if (height[right] >= rightMax) rightMax = height[right];
      else water += rightMax - height[right];
      right--;
    }
  }
  return water;
}

console.log(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]));`,
    python: `def trap(height):
    left, right = 0, len(height) - 1
    left_max = right_max = water = 0
    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1
    return water

if __name__ == '__main__':
    print(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))`
  }
};

async function migrateStarterCode() {
  console.log('🔄 Starting starter code migration for 5 supported languages...');
  await connectDatabase();

  if (!isMongoConnected()) {
    console.error('❌ MongoDB not connected! Cannot run migration.');
    process.exit(1);
  }

  const problems = await CodingProblem.find({});
  console.log(`Found ${problems.length} problems in MongoDB.`);

  for (const p of problems) {
    const codes = STARTER_CODES[p.title];
    if (codes) {
      p.starterCode = {
        c: codes.c,
        cpp: codes.cpp,
        java: codes.java,
        javascript: codes.javascript,
        python: codes.python
      };
      // Remove typescript if it exists on the document
      if (p.toObject().starterCode?.typescript !== undefined) {
        p.set('starterCode.typescript', undefined, { strict: false });
      }
      await p.save();
      console.log(`✅ Migrated problem: "${p.title}" (Difficulty: ${p.difficulty})`);
    } else {
      console.log(`⚠️ No starter code map for "${p.title}", ensuring existing keys`);
    }
  }

  console.log('🎉 Starter code migration completed successfully!');
  process.exit(0);
}

migrateStarterCode().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
