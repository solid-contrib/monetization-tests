import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE, WEBID_BOB } from '../helpers/env';
import { responseCodeGroup } from '../helpers/util';

function makeBody(accessToModes: string, defaultModes: string, target: string) {
  let str = [
    '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
    '',
    `<#alice> a acl:Authorization;\n  acl:agent <${WEBID_ALICE}>;`,
    `  acl:accessTo <${target}>;`,
    `  acl:default <${target}>;`,
    '  acl:mode acl:Read, acl:Write, acl:Control.',
    ''
  ].join('\n')
  if (accessToModes) {
    str += [
      '<#bobAccessTo> a acl:Authorization;',
      '  acl:agentClass acl:PayingAgent;',
      `  acl:accessTo <${target}>;`,
      `  acl:mode ${accessToModes}.`,
      ''
    ].join('\n')
  }
  if (defaultModes) {
    str += [
      '<#bobDefault> a acl:Authorization;',
      '  acl:agentClass acl:PayingAgent;',
      `  acl:default <${target}>;`,
      `  acl:mode ${defaultModes}.`,
      ''
    ].join('\n')
  }
  return str
}

describe('Read-Paying', () => {
  let solidLogicAlice: SolidLogic;
  let solidLogicBob: SolidLogic;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    solidLogicBob = await getSolidLogicInstance('BOB')
  });
  
  const { testFolderUrl } = generateTestFolder('ALICE');
  beforeEach(async () => {
    // FIXME: NSS ACL cache,
    // wait for ACL cache to clear:
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  afterEach(() => {
    // return solidLogicAlice.recursiveDelete(testFolderUrl);
  });
  it('Gives a 402 with accessTo Read access on non-container resource', async () => {
    const resourceUrl = `${testFolderUrl}1/test.txt`;
    // This will do mkdir-p:
    const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
      method: 'PUT',
      body: '<#hello> <#linked> <#world> .',
      headers: {
        'Content-Type': 'text/turtle',
        'If-None-Match': '*'
      }
    });
    const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
    await solidLogicAlice.fetch(aclDocUrl, {
      method: 'PUT',
      body: makeBody('acl:Read', null, resourceUrl),
      headers: {
        'Content-Type': 'text/turtle',
        // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
      }
    });
    const result = await solidLogicBob.fetch(resourceUrl)
    expect(result.status).toEqual("402");
  });
});
