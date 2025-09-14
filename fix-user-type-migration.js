#!/usr/bin/env node
/**
 * 🔧 User Type Migration Script
 * 'parent'/'child' → 4가지 역할 시스템 자동 마이그레이션
 */

const fs = require('fs')
const path = require('path')

// 수정이 필요한 핵심 파일들
const criticalFiles = [
  'lib/hooks/useRewardCenter.ts',
  'hooks/useMissionsQuery.ts', 
  'components/reward/RewardNotificationBadge.tsx',
  'lib/services/dailyMissionManager.ts',
  'lib/contexts/ChildSelectionContext.tsx',
  'app/allowance/page.tsx'
]

// roleUtils import가 필요한 패턴들
const needsRoleUtilsImport = [
  "profile?.user_type === 'parent'",
  "profile.user_type === 'parent'",  
  "profile?.user_type === 'child'",
  "profile.user_type === 'child'",
  "userType === 'parent'",
  "userType === 'child'"
]

// 교체할 패턴들
const replacementPatterns = [
  {
    find: /profile\.user_type === 'parent'/g,
    replace: "isParentRole(profile.user_type)"
  },
  {
    find: /profile\?.user_type === 'parent'/g,
    replace: "isParentRole(profile?.user_type)"
  },
  {
    find: /profile\.user_type === 'child'/g,
    replace: "isChildRole(profile.user_type)"
  },
  {
    find: /profile\?.user_type === 'child'/g,
    replace: "isChildRole(profile?.user_type)"
  },
  {
    find: /userType === 'parent'/g,
    replace: "isParentRole(userType)"
  },
  {
    find: /userType === 'child'/g,
    replace: "isChildRole(userType)"
  }
]

function processFile(filePath) {
  const fullPath = path.join(__dirname, filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ 파일 없음: ${filePath}`)
    return false
  }
  
  let content = fs.readFileSync(fullPath, 'utf8')
  let modified = false
  let needsImport = false
  
  // roleUtils import가 필요한지 확인
  for (const pattern of needsRoleUtilsImport) {
    if (content.includes(pattern)) {
      needsImport = true
      break
    }
  }
  
  // 이미 import가 있는지 확인
  if (needsImport && !content.includes("from '@/lib/utils/roleUtils'") && 
      !content.includes("from '../utils/roleUtils'")) {
    
    // import 추가 위치 찾기
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'))
    if (importLines.length > 0) {
      const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1])
      const insertPos = content.indexOf('\n', lastImportIndex) + 1
      
      // 상대 경로 결정
      const relativePath = filePath.startsWith('lib/') ? '../utils/roleUtils' : '@/lib/utils/roleUtils'
      const importStatement = `import { isParentRole, isChildRole } from '${relativePath}'\n`
      
      content = content.slice(0, insertPos) + importStatement + content.slice(insertPos)
      modified = true
      console.log(`✅ Import 추가: ${filePath}`)
    }
  }
  
  // 패턴 교체
  for (const { find, replace } of replacementPatterns) {
    const newContent = content.replace(find, replace)
    if (newContent !== content) {
      content = newContent
      modified = true
      console.log(`✅ 패턴 교체: ${filePath} - ${find}`)
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8')
    console.log(`🎉 파일 수정 완료: ${filePath}`)
    return true
  } else {
    console.log(`✨ 수정 불필요: ${filePath}`)
    return false
  }
}

console.log('🚀 User Type Migration 시작...\n')

let totalModified = 0
for (const file of criticalFiles) {
  if (processFile(file)) {
    totalModified++
  }
  console.log('') // 빈 줄
}

console.log(`🎊 Migration 완료! ${totalModified}개 파일 수정됨`)
console.log('\n⚠️ 중요: 수동으로 확인해야 할 파일들:')
console.log('- app/page.tsx (이미 수정됨)')
console.log('- components/auth/AuthProvider.tsx')
console.log('- components/layout/NavBar.tsx')
console.log('\n🧪 테스트 권장:')
console.log('1. npm run dev 실행')
console.log('2. 미션 시스템 테스트')
console.log('3. 용돈 시스템 테스트')
console.log('4. 가족 권한 테스트')