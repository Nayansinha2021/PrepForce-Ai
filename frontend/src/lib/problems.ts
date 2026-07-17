export type Difficulty = "Easy" | "Medium" | "Hard";

export interface TestCase {
  input: any[];
  expected: any;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  descriptionHtml: string;
  snippets: Record<string, string>;
  functionName: string;
  testCases: TestCase[];
}

export const problems: Problem[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    functionName: "twoSum",
    testCases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] }
    ],
    descriptionHtml: `
      <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>
      <p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>
      <div class="bg-black/30 p-4 rounded-lg border border-white/5 my-4">
        <p class="font-bold text-white mb-2">Example 1:</p>
        <p><span class="text-slate-400">Input:</span> nums = [2,7,11,15], target = 9</p>
        <p><span class="text-slate-400">Output:</span> [0,1]</p>
        <p><span class="text-slate-400">Explanation:</span> Because nums[0] + nums[1] == 9, we return [0, 1].</p>
      </div>
      <div>
        <h3 class="font-bold text-white mb-2 mt-6">Constraints:</h3>
        <ul class="list-disc pl-5 space-y-1 text-slate-400">
          <li><code>2 &lt;= nums.length &lt;= 10^4</code></li>
          <li><code>-10^9 &lt;= nums[i] &lt;= 10^9</code></li>
          <li><code>-10^9 &lt;= target &lt;= 10^9</code></li>
        </ul>
      </div>
    `,
    snippets: {
      javascript: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};",
      python: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        ",
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}"
    }
  },
  {
    id: "longest-substring",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    tags: ["String", "Sliding Window"],
    functionName: "lengthOfLongestSubstring",
    testCases: [
      { input: ["abcabcbb"], expected: 3 },
      { input: ["bbbbb"], expected: 1 },
      { input: ["pwwkew"], expected: 3 }
    ],
    descriptionHtml: `
      <p>Given a string <code>s</code>, find the length of the <strong>longest substring</strong> without repeating characters.</p>
      <div class="bg-black/30 p-4 rounded-lg border border-white/5 my-4">
        <p class="font-bold text-white mb-2">Example 1:</p>
        <p><span class="text-slate-400">Input:</span> s = "abcabcbb"</p>
        <p><span class="text-slate-400">Output:</span> 3</p>
        <p><span class="text-slate-400">Explanation:</span> The answer is "abc", with the length of 3.</p>
      </div>
      <div>
        <h3 class="font-bold text-white mb-2 mt-6">Constraints:</h3>
        <ul class="list-disc pl-5 space-y-1 text-slate-400">
          <li><code>0 &lt;= s.length &lt;= 5 * 10^4</code></li>
          <li><code>s</code> consists of English letters, digits, symbols and spaces.</li>
        </ul>
      </div>
    `,
    snippets: {
      javascript: "/**\n * @param {string} s\n * @return {number}\n */\nvar lengthOfLongestSubstring = function(s) {\n    \n};",
      python: "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        ",
      cpp: "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        \n    }\n};",
      java: "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        \n    }\n}"
    }
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Medium",
    tags: ["Array", "Sorting"],
    functionName: "merge",
    testCases: [
      { input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { input: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { input: [[[1, 4], [0, 4]]], expected: [[0, 4]] }
    ],
    descriptionHtml: `
      <p>Given an array of <code>intervals</code> where <code>intervals[i] = [starti, endi]</code>, merge all overlapping intervals, and return <em>an array of the non-overlapping intervals that cover all the intervals in the input</em>.</p>
      <div class="bg-black/30 p-4 rounded-lg border border-white/5 my-4">
        <p class="font-bold text-white mb-2">Example 1:</p>
        <p><span class="text-slate-400">Input:</span> intervals = [[1,3],[2,6],[8,10],[15,18]]</p>
        <p><span class="text-slate-400">Output:</span> [[1,6],[8,10],[15,18]]</p>
        <p><span class="text-slate-400">Explanation:</span> Since intervals [1,3] and [2,6] overlap, merge them into [1,6].</p>
      </div>
      <div>
        <h3 class="font-bold text-white mb-2 mt-6">Constraints:</h3>
        <ul class="list-disc pl-5 space-y-1 text-slate-400">
          <li><code>1 &lt;= intervals.length &lt;= 10^4</code></li>
          <li><code>intervals[i].length == 2</code></li>
          <li><code>0 &lt;= starti &lt;= endi &lt;= 10^4</code></li>
        </ul>
      </div>
    `,
    snippets: {
      javascript: "/**\n * @param {number[][]} intervals\n * @return {number[][]}\n */\nvar merge = function(intervals) {\n    \n};",
      python: "class Solution:\n    def merge(self, intervals: List[List[int]]) -> List[List[int]]:\n        ",
      cpp: "class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        \n    }\n};",
      java: "class Solution {\n    public int[][] merge(int[][] intervals) {\n        \n    }\n}"
    }
  }
];
