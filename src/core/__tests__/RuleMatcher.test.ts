import { RuleMatcher } from '../RuleMatcher';
import { FileMetadata } from '../../types/Common';
import { Rule } from '../../types/Rule';

describe('RuleMatcher', () => {
    let ruleMatcher: RuleMatcher;
    let mockMetadata: FileMetadata;

    beforeEach(() => {
        ruleMatcher = new RuleMatcher();
        mockMetadata = {
            fileName: 'test.md',
            filePath: 'folder/test.md',
            tags: ['#work', '#project/alpha'],
            properties: { 
                status: 'active',
                priority: 'high',
                count: 42
            },
            fileContent: 'This is a test file with some content',
            createdAt: new Date('2023-01-01T10:00:00Z'),
            updatedAt: new Date('2023-01-02T15:30:00Z')
        };
    });

    describe('matchTag', () => {
        it('should match exact tags', () => {
            expect(ruleMatcher.matchTag(['#work', '#project'], '#work')).toBe(true);
            expect(ruleMatcher.matchTag(['#work', '#project'], '#home')).toBe(false);
        });

        it('should match parent tags with subtags', () => {
            expect(ruleMatcher.matchTag(['#work/urgent', '#project'], '#work')).toBe(true);
            expect(ruleMatcher.matchTag(['#project/alpha/beta'], '#project')).toBe(true);
            expect(ruleMatcher.matchTag(['#project/alpha/beta'], '#project/alpha')).toBe(true);
        });

        it('should not match unrelated tags', () => {
            expect(ruleMatcher.matchTag(['#work'], '#project')).toBe(false);
            expect(ruleMatcher.matchTag(['#workplace'], '#work')).toBe(false);
        });
    });

    describe('matchProperty', () => {
        const properties = {
            status: 'active',
            priority: 'high',
            count: 42,
            empty: '',
            nullValue: null
        };

        it('should match property existence', () => {
            expect(ruleMatcher.matchProperty(properties, 'status')).toBe(true);
            expect(ruleMatcher.matchProperty(properties, 'priority')).toBe(true);
            expect(ruleMatcher.matchProperty(properties, 'nonexistent')).toBe(false);
            expect(ruleMatcher.matchProperty(properties, 'nullValue')).toBe(false);
        });

        it('should match exact property values', () => {
            expect(ruleMatcher.matchProperty(properties, 'status:active')).toBe(true);
            expect(ruleMatcher.matchProperty(properties, 'priority:high')).toBe(true);
            expect(ruleMatcher.matchProperty(properties, 'count:42')).toBe(true);
            expect(ruleMatcher.matchProperty(properties, 'status:inactive')).toBe(false);
        });

        it('should handle case insensitive matching', () => {
            expect(ruleMatcher.matchProperty(properties, 'status:ACTIVE')).toBe(true);
            expect(ruleMatcher.matchProperty(properties, 'priority:HIGH')).toBe(true);
        });

        it('should handle empty values', () => {
            expect(ruleMatcher.matchProperty(properties, 'empty:')).toBe(true);
            expect(ruleMatcher.matchProperty(properties, 'empty:something')).toBe(false);
        });
    });

    describe('matchFileName', () => {
        it('should match exact file names', () => {
            expect(ruleMatcher.matchFileName('test.md', 'test.md')).toBe(true);
            expect(ruleMatcher.matchFileName('Daily Test.md', 'Daily Test.md')).toBe(true);
            expect(ruleMatcher.matchFileName('test.md', 'other.md')).toBe(false);
        });

        it('should match wildcard patterns with *', () => {
            // Test cases from the user's issue
            expect(ruleMatcher.matchFileName('Daily Test.md', 'Daily*')).toBe(true);
            expect(ruleMatcher.matchFileName('Daily Notes.md', 'Daily*')).toBe(true);
            expect(ruleMatcher.matchFileName('Course - Introduction.md', 'Course*')).toBe(true);
            expect(ruleMatcher.matchFileName('Course - Advanced.md', 'Course*')).toBe(true);
            
            // Edge cases
            expect(ruleMatcher.matchFileName('test.md', 'test*')).toBe(true);
            expect(ruleMatcher.matchFileName('test.txt', 'test*')).toBe(true);
            expect(ruleMatcher.matchFileName('other.md', 'test*')).toBe(false);
            expect(ruleMatcher.matchFileName('pretest.md', 'test*')).toBe(false);
        });

        it('should match wildcard patterns with ?', () => {
            expect(ruleMatcher.matchFileName('test1.md', 'test?.md')).toBe(true);
            expect(ruleMatcher.matchFileName('testA.md', 'test?.md')).toBe(true);
            expect(ruleMatcher.matchFileName('test.md', 'test?.md')).toBe(false);
            expect(ruleMatcher.matchFileName('test12.md', 'test?.md')).toBe(false);
        });

        it('should be case insensitive', () => {
            expect(ruleMatcher.matchFileName('Daily Test.md', 'daily*')).toBe(true);
            expect(ruleMatcher.matchFileName('daily test.md', 'Daily*')).toBe(true);
            expect(ruleMatcher.matchFileName('COURSE - Intro.md', 'course*')).toBe(true);
        });

        it('should handle complex patterns', () => {
            expect(ruleMatcher.matchFileName('Course - Introduction.md', 'Course*')).toBe(true);
            expect(ruleMatcher.matchFileName('Course - Advanced Topics.md', 'Course*')).toBe(true);
            expect(ruleMatcher.matchFileName('Meeting Notes.md', 'Meeting*')).toBe(true);
            expect(ruleMatcher.matchFileName('Daily Test.md', 'Daily*')).toBe(true);
        });

        it('should handle patterns with special regex characters', () => {
            // Test that special regex characters are properly escaped
            expect(ruleMatcher.matchFileName('test.file.md', 'test.file*')).toBe(true);
            expect(ruleMatcher.matchFileName('test+file.md', 'test+file*')).toBe(true);
            expect(ruleMatcher.matchFileName('test[file].md', 'test[file]*')).toBe(true);
            expect(ruleMatcher.matchFileName('test(file).md', 'test(file)*')).toBe(true);
        });

        it('should handle empty patterns', () => {
            expect(ruleMatcher.matchFileName('test.md', '')).toBe(false);
            expect(ruleMatcher.matchFileName('', 'test*')).toBe(false);
            expect(ruleMatcher.matchFileName('', '')).toBe(true);
        });
    });

    describe('evaluateCriteria', () => {
        it('should evaluate tag criteria', () => {
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'tag:#work')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'tag:#project')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'tag:#home')).toBe(false);
        });

        it('should evaluate fileName criteria', () => {
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'fileName:test.md')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'fileName:other.md')).toBe(false);
        });

        it('should evaluate fileName criteria with wildcards', () => {
            // Test wildcard patterns
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'fileName:test*')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'fileName:*.md')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'fileName:test?.md')).toBe(false); // ? requires exactly one character
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'fileName:other*')).toBe(false);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'fileName:*.txt')).toBe(false);
        });

        it('should handle real-world fileName patterns from user issue', () => {
            // Create metadata for the specific files mentioned in the issue
            const dailyTestMetadata = {
                ...mockMetadata,
                fileName: 'Daily Test.md'
            };
            const courseMetadata = {
                ...mockMetadata,
                fileName: 'Course - Introduction.md'
            };

            // Test the exact patterns the user tried
            expect(ruleMatcher.evaluateCriteria(dailyTestMetadata, 'fileName:Daily')).toBe(false); // No wildcard
            expect(ruleMatcher.evaluateCriteria(dailyTestMetadata, 'fileName:Daily*')).toBe(true); // With wildcard
            expect(ruleMatcher.evaluateCriteria(dailyTestMetadata, 'fileName:Daily -')).toBe(false); // No wildcard
            expect(ruleMatcher.evaluateCriteria(dailyTestMetadata, 'fileName:Daily *')).toBe(true); // With wildcard (space instead of dash)
            
            expect(ruleMatcher.evaluateCriteria(courseMetadata, 'fileName:Course')).toBe(false); // No wildcard
            expect(ruleMatcher.evaluateCriteria(courseMetadata, 'fileName:Course*')).toBe(true); // With wildcard
            expect(ruleMatcher.evaluateCriteria(courseMetadata, 'fileName:Course -')).toBe(false); // No wildcard
            expect(ruleMatcher.evaluateCriteria(courseMetadata, 'fileName:Course - *')).toBe(true); // With wildcard
        });

        it('should evaluate path criteria', () => {
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'path:folder/test.md')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'path:other/path.md')).toBe(false);
        });

        it('should evaluate content criteria', () => {
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'content:test file')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'content:missing text')).toBe(false);
        });

        it('should evaluate date criteria', () => {
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'created_at:2023-01-01')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'updated_at:2023-01-02')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'created_at:2023-02-01')).toBe(false);
        });

        it('should evaluate property criteria', () => {
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'property:status:active')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'property:priority')).toBe(true);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'property:status:inactive')).toBe(false);
        });

        it('should handle invalid criteria format', () => {
            expect(ruleMatcher.evaluateCriteria(mockMetadata, 'invalid_format')).toBe(false);
            expect(ruleMatcher.evaluateCriteria(mockMetadata, '')).toBe(false);
        });
    });

    describe('evaluateFilter', () => {
        it('should pass when no filter is set', () => {
            expect(ruleMatcher.evaluateFilter(mockMetadata, [], false)).toBe(true);
            expect(ruleMatcher.evaluateFilter(mockMetadata, [], true)).toBe(true);
        });

        it('should handle blacklist filter', () => {
            // File matches blacklist filter - should not pass
            expect(ruleMatcher.evaluateFilter(mockMetadata, ['tag:#work'], false)).toBe(false);
            // File doesn't match blacklist filter - should pass
            expect(ruleMatcher.evaluateFilter(mockMetadata, ['tag:#home'], false)).toBe(true);
        });

        it('should handle whitelist filter', () => {
            // File matches whitelist filter - should pass
            expect(ruleMatcher.evaluateFilter(mockMetadata, ['tag:#work'], true)).toBe(true);
            // File doesn't match whitelist filter - should not pass
            expect(ruleMatcher.evaluateFilter(mockMetadata, ['tag:#home'], true)).toBe(false);
        });

        it('should handle multiple filters', () => {
            const multipleFilters = ['tag:#work', 'fileName:test.md'];
            
            // Blacklist: if any filter matches, file is blocked
            expect(ruleMatcher.evaluateFilter(mockMetadata, multipleFilters, false)).toBe(false);
            
            // Whitelist: all filters must match for file to pass
            expect(ruleMatcher.evaluateFilter(mockMetadata, multipleFilters, true)).toBe(true);
            
            const mixedFilters = ['tag:#work', 'fileName:other.md'];
            expect(ruleMatcher.evaluateFilter(mockMetadata, mixedFilters, true)).toBe(false);
        });
    });

    describe('findMatchingRule', () => {
        const rules: Rule[] = [
            { criteria: 'tag:#work', path: 'work-folder' },
            { criteria: 'tag:#project', path: 'project-folder' },
            { criteria: 'fileName:test.md', path: 'test-folder' },
            { criteria: 'property:status:active', path: 'active-folder' }
        ];

        it('should find matching rule', () => {
            const result = ruleMatcher.findMatchingRule(mockMetadata, rules);
            expect(result).not.toBeNull();
            expect(result?.path).toBe('work-folder'); // First matching rule
        });

        it('should return null when no rule matches', () => {
            const noMatchMetadata: FileMetadata = {
                ...mockMetadata,
                tags: ['#home'],
                fileName: 'other.md',
                properties: { status: 'inactive' }
            };
            
            const result = ruleMatcher.findMatchingRule(noMatchMetadata, rules);
            expect(result).toBeNull();
        });

        it('should respect rule priority based on specificity', () => {
            const specificRules: Rule[] = [
                { criteria: 'tag:#project', path: 'general-project' },
                { criteria: 'tag:#project/alpha', path: 'specific-project' }
            ];
            
            const result = ruleMatcher.findMatchingRule(mockMetadata, specificRules);
            expect(result?.path).toBe('specific-project'); // More specific rule should win
        });
    });

    describe('sortRulesBySpecificity', () => {
        it('should sort tag rules by specificity', () => {
            const rules: Rule[] = [
                { criteria: 'tag:#work', path: 'work' },
                { criteria: 'tag:#work/urgent/critical', path: 'critical' },
                { criteria: 'tag:#work/urgent', path: 'urgent' },
                { criteria: 'fileName:test.md', path: 'test' }
            ];

            const sorted = ruleMatcher.sortRulesBySpecificity(rules);
            
            expect(sorted[0].path).toBe('critical'); // Most specific tag
            expect(sorted[1].path).toBe('urgent');   // Medium specific tag
            expect(sorted[2].path).toBe('work');     // Least specific tag
            expect(sorted[3].path).toBe('test');     // Non-tag rule maintains position
        });

        it('should maintain order for non-tag rules', () => {
            const rules: Rule[] = [
                { criteria: 'fileName:test.md', path: 'test' },
                { criteria: 'property:status:active', path: 'active' },
                { criteria: 'content:important', path: 'important' }
            ];

            const sorted = ruleMatcher.sortRulesBySpecificity(rules);
            
            // Order should remain the same for non-tag rules
            expect(sorted.map(r => r.path)).toEqual(['test', 'active', 'important']);
        });
    });

    describe('getFilterMatchDetails', () => {
        it('should return passes=true when no filter', () => {
            const result = ruleMatcher.getFilterMatchDetails(mockMetadata, [], false);
            expect(result.passes).toBe(true);
            expect(result.blockingFilter).toBeUndefined();
        });

        it('should provide blocking filter details for blacklist', () => {
            const result = ruleMatcher.getFilterMatchDetails(mockMetadata, ['tag:#work'], false);
            expect(result.passes).toBe(false);
            expect(result.blockingFilter).toBe('tag:#work');
            expect(result.blockReason).toBe('Blocked by blacklist filter');
        });

        it('should provide blocking filter details for whitelist', () => {
            const result = ruleMatcher.getFilterMatchDetails(mockMetadata, ['tag:#home'], true);
            expect(result.passes).toBe(false);
            expect(result.blockingFilter).toBe('tag:#home');
            expect(result.blockReason).toBe('Not in whitelist');
        });

        it('should return passes=true when filter passes', () => {
            const result = ruleMatcher.getFilterMatchDetails(mockMetadata, ['tag:#work'], true);
            expect(result.passes).toBe(true);
            expect(result.blockingFilter).toBeUndefined();
        });
    });
});
