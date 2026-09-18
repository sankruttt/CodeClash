/**
 * starterCodes.js
 * 
 * Standard, multiline starter code templates for all 9 production problems across all 5 supported languages:
 * C, C++, Java, JavaScript (Deno), Python.
 * 
 * Uses true newlines and indentation — no escaped '\\n' strings.
 */

const DENO_STDIN = `const _buf = new Uint8Array(1048576);
const _n = Deno.stdin.readSync(_buf);
const _input = new TextDecoder().decode(_buf.subarray(0, _n)).trim();
const lines = _input.split('\\n');`;

export const starterCodesByTitle = {
  'Climbing Stairs': {
    c: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Your code here
    return 0;
}
`,
    cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    // Your code here
    return 0;
}
`,
    java: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        // Your code here
    }
}
`,
    javascript: `${DENO_STDIN}

const n = parseInt(lines[0]);
// Your code here
`,
    python: `import sys

def solve():
    line = sys.stdin.readline().strip()
    if not line:
        return
    n = int(line)
    # Your code here

if __name__ == '__main__':
    solve()
`
  },

  'Activity Selection': {
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Your code here
    return 0;
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    // Your code here
    return 0;
}
`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        // Your code here
    }
}
`,
    javascript: `${DENO_STDIN}

const n = parseInt(lines[0]);
// Your code here
`,
    python: `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    # Your code here

if __name__ == '__main__':
    solve()
`
  },

  'Sliding Window Maximum': {
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    // Your code here
    return 0;
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <deque>
using namespace std;

int main() {
    int n, k;
    if (!(cin >> n >> k)) return 0;
    // Your code here
    return 0;
}
`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int k = sc.nextInt();
        // Your code here
    }
}
`,
    javascript: `${DENO_STDIN}

const [n, k] = lines[0].split(' ').map(Number);
const arr = lines[1].split(' ').map(Number);
// Your code here
`,
    python: `import sys

def solve():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n, k = map(int, lines[0].split())
    arr = list(map(int, lines[1].split()))
    # Your code here

if __name__ == '__main__':
    solve()
`
  },

  'Shortest Path in Unweighted Graph': {
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    // Your code here
    return 0;
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <queue>
using namespace std;

int main() {
    int n, m;
    if (!(cin >> n >> m)) return 0;
    // Your code here
    return 0;
}
`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int m = sc.nextInt();
        // Your code here
    }
}
`,
    javascript: `${DENO_STDIN}

const [n, m] = lines[0].split(' ').map(Number);
// Your code here
`,
    python: `import sys
from collections import deque

def solve():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n, m = map(int, lines[0].split())
    # Your code here

if __name__ == '__main__':
    solve()
`
  },

  'Longest Increasing Subsequence': {
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Your code here
    return 0;
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    // Your code here
    return 0;
}
`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        // Your code here
    }
}
`,
    javascript: `${DENO_STDIN}

const n = parseInt(lines[0]);
const arr = lines[1].split(' ').map(Number);
// Your code here
`,
    python: `import sys
from bisect import bisect_left

def solve():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0])
    arr = list(map(int, lines[1].split()))
    # Your code here

if __name__ == '__main__':
    solve()
`
  },

  'Prefix Search Engine': {
    c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Your code here
    return 0;
}
`,
    cpp: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    // Your code here
    return 0;
}
`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        // Your code here
    }
}
`,
    javascript: `${DENO_STDIN}

let idx = 0;
const n = parseInt(lines[idx++]);
// Your code here
`,
    python: `import sys

def solve():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n = int(lines[0])
    # Your code here

if __name__ == '__main__':
    solve()
`
  },

  "Dijkstra's Shortest Path": {
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    // Your code here
    return 0;
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <queue>
using namespace std;

int main() {
    int n, m;
    if (!(cin >> n >> m)) return 0;
    // Your code here
    return 0;
}
`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int m = sc.nextInt();
        // Your code here
    }
}
`,
    javascript: `${DENO_STDIN}

const [n, m] = lines[0].split(' ').map(Number);
// Your code here
`,
    python: `import sys
import heapq

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    m = int(input_data[1])
    # Your code here

if __name__ == '__main__':
    solve()
`
  },

  'Deadlock Detector': {
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int p, r, q;
    if (scanf("%d %d %d", &p, &r, &q) != 3) return 0;
    // Your code here
    return 0;
}
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int p, r, q;
    if (!(cin >> p >> r >> q)) return 0;
    // Your code here
    return 0;
}
`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int p = sc.nextInt();
        int r = sc.nextInt();
        int q = sc.nextInt();
        // Your code here
    }
}
`,
    javascript: `${DENO_STDIN}

const [p, r, q] = lines[0].split(' ').map(Number);
// Your code here
`,
    python: `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    p = int(input_data[0])
    r = int(input_data[1])
    q = int(input_data[2])
    # Your code here

if __name__ == '__main__':
    solve()
`
  },

  'Range Sum with Updates': {
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, q;
    if (scanf("%d %d", &n, &q) != 2) return 0;
    // Your code here
    return 0;
}
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n, q;
    if (!(cin >> n >> q)) return 0;
    // Your code here
    return 0;
}
`,
    java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        StringTokenizer st = new StringTokenizer(line);
        int n = Integer.parseInt(st.nextToken());
        int q = Integer.parseInt(st.nextToken());
        // Your code here
    }
}
`,
    javascript: `${DENO_STDIN}

let idx = 0;
const [n, q] = lines[idx++].split(' ').map(Number);
const arr = lines[idx++].split(' ').map(Number);
// Your code here
`,
    python: `import sys

def solve():
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    n, q = map(int, lines[0].split())
    arr = list(map(int, lines[1].split()))
    # Your code here

if __name__ == '__main__':
    solve()
`
  }
};

export default starterCodesByTitle;
