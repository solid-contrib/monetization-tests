import { SolidLogic } from 'solid-logic';
import { getSolidLogicInstance, WEBID_ALICE } from '../helpers/env';
import { responseCodeGroup } from '../helpers/util';
import fetch from 'node-fetch';

describe('Vanity Payment Pointer', () => {
  let solidLogicAlice: SolidLogic;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
  });

  describe('Alice has a pp:PaymentPointer triple in her profile, no slash', () => {
    beforeAll(async () => {
      const result = await solidLogicAlice.fetch(solidLogicAlice.me, {
        method: 'PUT',
        body: '<#me> <http://paymentpointers.org/ns#PaymentPointer> "$example.com" .',
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      expect(responseCodeGroup(result.status)).toEqual('2xx');
    });

    it('makes /.well-known/pay redirects to it', async () => {
      const podRoot = new URL(solidLogicAlice.me).origin;
      const result = await fetch(`${podRoot}/.well-known/pay`, { redirect: 'manual' });
      expect(result.status).toEqual(302);
      expect(result.headers.get('Location')).toEqual('https://example.com/.well-known/pay');
    });
  });
  describe('Alice has a pp:PaymentPointer triple in her profile, with slash', () => {
    beforeAll(async () => {
      const result = await solidLogicAlice.fetch(solidLogicAlice.me, {
        method: 'PUT',
        body: '<#me> <http://paymentpointers.org/ns#PaymentPointer> "$example.com/foo/bar" .',
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      expect(responseCodeGroup(result.status)).toEqual('2xx');
    });

    it('makes /.well-known/pay redirects to it', async () => {
      const podRoot = new URL(solidLogicAlice.me).origin;
      const result = await fetch(`${podRoot}/.well-known/pay`, { redirect: 'manual' });
      expect(result.status).toEqual(302);
      expect(result.headers.get('Location')).toEqual('https://example.com/foo/bar');
    });
  });
});
