# ⚠️ IMPORTANT: Restart Required After Applying Fixes

## Node.js Module Caching

After applying the AJV v8 compatibility fixes, you **MUST restart Node.js or reload VSCode** to clear the module cache.

Node.js caches required modules in memory. Changes to files in `node_modules/` won't take effect until the process restarts.

---

## How to Restart

### For VSCode Extensions (f5-chariot)

**Option 1: Reload Window**
1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `Reload Window`
3. Select: **Developer: Reload Window**

**Option 2: Restart Extension Host**
1. Press `F1` to open Command Palette
2. Type: `Restart Extension`
3. Select: **Developer: Restart Extension Host**

**Option 3: Close and Reopen VSCode**
- Close VSCode completely
- Reopen your workspace

---

### For Node.js Scripts

**Stop and restart your Node.js process:**
```bash
# If running node directly
# Press Ctrl+C to stop, then restart

# If using nodemon
# It should restart automatically when files change
```

---

## Verification

After restarting, test the fix:

```javascript
const accc = require('f5-automation-config-converter');

const config = `
ltm pool /Common/test_pool {
    members {
        /Common/192.168.1.10:80 { }
    }
}
`;

accc.mainAPI(config)
    .then(result => {
        console.log('✓ Success! Fixes are working.');
    })
    .catch(err => {
        console.error('✗ Error:', err.message);
        console.log('\nIf you still see the error, make sure you:');
        console.log('1. Applied all three fixes correctly');
        console.log('2. Restarted Node.js/VSCode');
        console.log('3. Are editing the correct node_modules location');
    });
```

---

## Troubleshooting

**Still getting the error after restart?**

1. **Verify fixes are applied:**
   ```bash
   # Check bigip keyword
   grep "name: 'bigip'" node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/adcParserKeywords.js

   # Check strict mode
   grep "strict: false" node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/schemaValidator.js

   # Check uri format
   grep "name: 'uri'" node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/adcParserFormats.js
   ```

2. **Check the correct installation:**
   - For vscode-f5-chariot: `/home/ted/vscode-f5-chariot/node_modules/f5-automation-config-converter/node_modules/@automation-toolchain/f5-appsvcs-classic-schema/`
   - For direct use: `/home/ted/accc/node_modules/@automation-toolchain/f5-appsvcs-classic-schema/`

3. **Force clear cache (VSCode):**
   ```bash
   # Close VSCode, then:
   rm -rf ~/.config/Code/Cache/*
   rm -rf ~/.config/Code/CachedData/*
   # Reopen VSCode
   ```

4. **Check for multiple installations:**
   ```bash
   find /home/ted -name "f5-appsvcs-classic-schema" -type d 2>/dev/null
   # Apply fixes to all found locations
   ```

---

## Why This Happens

When Node.js executes `require('ajv')` or any module, it:
1. Resolves the module path
2. Loads and executes the code
3. **Caches the result in `require.cache`**
4. Returns the cached version on subsequent requires

This means:
- ✅ Changes take effect when you restart the process
- ❌ Changes don't take effect in already-running processes
- ❌ Hot-reloading doesn't work for node_modules changes

---

## Next Time

To avoid manual restarts after `npm install`, use **patch-package**:

```bash
npm install patch-package --save-dev
npx patch-package @automation-toolchain/f5-appsvcs-classic-schema
```

Add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

This automatically reapplies patches after every `npm install`.

---

**See [AJV_V8_COMPATIBILITY.md](AJV_V8_COMPATIBILITY.md) for complete documentation.**
