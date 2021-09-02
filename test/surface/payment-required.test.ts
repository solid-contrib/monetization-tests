import { URL } from 'url';
import { createServer, Server } from 'http';
import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE, WEBID_BOB } from '../helpers/env';
// import { responseCodeGroup } from '../helpers/util';

class Oracle {
  paid = []
  calls: URL[]
  server: Server
  constructor() {
    this.calls = []
    this.server = createServer((req, res) => {
      const url = new URL(`http://oracle${req.url}`);
      // console.log('oracle hit!', url.searchParams.get('agent'), url.searchParams.get('resource'))
      this.calls.push(url)
      const str = `${url.searchParams.get('agent')} ${url.searchParams.get('resource')}`
      // console.log('searching guest list', str, this.paid)
      if (this.paid.indexOf(str) === -1) {
        res.end(JSON.stringify({
          payHeaders: [
            'interledger-stream some.destination.account. Some+Shared+Secret+in+Base64=='
          ]
        }))
      } else {
        res.end(JSON.stringify({ ok: true }));
      }
    })
  }
}

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
  let oracle: Oracle;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    solidLogicBob = await getSolidLogicInstance('BOB')
    oracle = new Oracle();
    await oracle.server.listen(8402);
    // console.log('oracle listening')
  });
  afterAll(async () => {
    oracle.server.close();
  });
  
  const { testFolderUrl } = generateTestFolder('ALICE');
  const resourceUrl = `${testFolderUrl}1/test.txt`;

  beforeEach(async () => {
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
    
    // FIXME: NSS ACL cache,
    // wait for ACL cache to clear:
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  afterEach(() => {
    // return solidLogicAlice.recursiveDelete(testFolderUrl);
  });
  it('Gives a 402', async () => {
    const result = await solidLogicBob.fetch(resourceUrl)
    expect(result.status).toEqual(402);
    const payHeader = result.headers.get('Pay');
    expect(payHeader).toEqual('interledger-stream some.destination.account. Some+Shared+Secret+in+Base64==');
  });
  describe('After user pays', () => {
    beforeAll(() => {
      oracle.paid.push(`${WEBID_BOB} ${resourceUrl}`)
    });
    it('Gives a 200', async () => {
      const result = await solidLogicBob.fetch(resourceUrl)
      expect(result.status).toEqual(200);
    });  
  })
});
